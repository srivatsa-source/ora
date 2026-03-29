import { useMemo, useState, useRef, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";

const initialResult = {
  roast: "",
  verdict: ""
};

function RoastPage() {
  const [phase, setPhase] = useState("listening"); // listening, analyzing, done, error
  const [judgeResult, setJudgeResult] = useState({ roast: "", verdict: "" });
  const [audioUrl, setAudioUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    let recorder = null;
    let timer = null;

    async function initMic() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = e => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach(track => track.stop());
          
          setPhase("analyzing");
          handleSpeechAndRoast(audioBlob);
        };

        recorder.start();
        
        // Auto stop after 3 minutes
        timer = setTimeout(() => {
          if (recorder.state !== "inactive") {
            recorder.stop();
          }
        }, 180000); 

      } catch (err) {
        console.error("Mic error:", err);
        setErrorMsg("Could not access microphone.");
        setPhase("error");
      }
    }
    
    initMic();

    return () => {
       if (recorder && recorder.state !== "inactive") {
           recorder.stop();
       }
       if (timer) clearTimeout(timer);
    };
  }, []);

  async function handleSpeechAndRoast(audioBlob) {
     try {
        let transcript = "";
        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");
        
        // 1. Transcribe using backend
        const sttRes = await fetch("/api/transcribe", { method: "POST", body: formData });
        
        if (sttRes.ok) {
           const data = await sttRes.json();
           transcript = data.text;
        } else {
           throw new Error("Transcription API Failed. Make sure ffmpeg is installed system-wide.");
        }

        if (!transcript || transcript.trim() === "") {
           transcript = "They stayed perfectly silent. The fear must have got to them.";
        }

        // Remove spaces inside JSON before sending since Ollama gets picky sometimes
        const judgeRes = await fetch("/api/judge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pitch_text: transcript, include_tts_audio: true })
        });
        
        if (!judgeRes.ok) throw new Error("Judging API failed.");
        const jData = await judgeRes.json();
        
        setJudgeResult(jData.result || { roast: "Error", verdict: "KICK" });
        if (jData.audio_base64 && jData.audio_mime) {
            const bytes = atob(jData.audio_base64);
            const arr = new Uint8Array(bytes.length);
            for (let i=0; i<bytes.length; i++) arr[i] = bytes.charCodeAt(i);
            const blob = new Blob([arr], { type: jData.audio_mime });
            setAudioUrl(URL.createObjectURL(blob));
        }
        setPhase("done");
     } catch (err) {
        console.error("Pipeline Error:", err);
        setErrorMsg(String(err));
        setPhase("error");
     }
  }

  // UI rendering based on phase
  let faceColor = "#ff4d6d"; // Creepy red by default
  let face = "( O _ O )";
  let statusText = "Listening directly to your soul... (Auto-roast after 3 min)";
  
  if (phase === "analyzing") { 
     face = "( -_ - )"; 
     statusText = "Judging your pathetic existence..."; 
     faceColor = "#f7c948"; 
  } else if (phase === "done") { 
     face = judgeResult.verdict === "STAY" ? "( ⌐■_■ )" : "( ಠ_ಠ )";
     faceColor = judgeResult.verdict === "STAY" ? "#7bd389" : "#ff4d6d"; 
     statusText = "";
  } else if (phase === "error") { 
     face = "( x_x )"; 
     statusText = errorMsg; 
     faceColor = "#93a4b5"; 
  }

  return (
    <section className="nes-container is-dark" style={{ marginTop: '40px', minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
       
       <pre style={{ fontSize: '6rem', color: faceColor, transition: 'color 0.5s', margin: '0', textShadow: `0px 0px 20px ${faceColor}44` }}>
          {face}
       </pre>
       
       {statusText && (
         <h2 style={{ color: faceColor, marginTop: '40px', fontWeight: 'bold' }}>{statusText}</h2>
       )}
       
       {phase === "listening" && (
           <button 
             className="nes-btn is-error" 
             style={{ marginTop: '30px' }}
             onClick={() => mediaRecorderRef.current?.stop()}
           >
              Stop & Roast Prematurely
           </button>
       )}

       {phase === "done" && (
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <p style={{ fontSize: '1.5rem', lineHeight: '1.8', color: '#fff', marginTop: '40px' }}>{judgeResult.roast}</p>
            <h1 style={{ fontSize: '4rem', color: faceColor, letterSpacing: '8px', margin: '30px 0' }}>[ {judgeResult.verdict} ]</h1>
            
            {audioUrl && <audio autoPlay src={audioUrl} controls style={{ width: '100%', marginBottom: '20px' }} />}
            
            <button className="nes-btn is-primary" onClick={() => window.location.reload()} style={{ marginTop: '20px' }}>
               Process Another Victim
            </button>
          </div>
       )}
    </section>
  )
}

function DemographicsPage() {
  const [csvUrl, setCsvUrl] = useState("");
  const [charts, setCharts] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [demoStatus, setDemoStatus] = useState("");
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const fileInputRef = useRef(null);

  async function onGenerateDemographics() {
    setLoadingDemo(true);
    setDemoStatus("");
    try {
      const response = await fetch("/api/demographics/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv_url: csvUrl || null })
      });

      if (!response.ok) throw new Error("API failed");

      const data = await response.json();
      setDemoStatus(data.message || "Done");
      setCharts(data.charts || []);
      setRawData(data.raw_data || []);
    } catch (err) {
      setDemoStatus(String(err));
      setCharts([]);
      setRawData([]);
    } finally {
      setLoadingDemo(false);
    }
  }

  async function onUpload(e) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setLoadingDemo(true);
    setDemoStatus("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/demographics/upload", {
        method: "POST",
        body: formData
      });

      if (!response.ok) throw new Error("Upload API failed");

      const data = await response.json();
      setDemoStatus(data.message || "Done");
      setCharts(data.charts || []);
      setRawData(data.raw_data || []);
    } catch (err) {
      setDemoStatus(String(err));
      setCharts([]);
      setRawData([]);
    } finally {
      setLoadingDemo(false);
      e.target.value = null;
    }
  }

  function handleBarClick(column, label) {
    const records = rawData.filter(row => String(row[column]) === label);
    setSelectedDetail({ column, label, rows: records });
  }

  return (
    <section className="nes-container with-title is-dark" style={{ marginTop: '20px' }}>
      <p className="title">Interactive View</p>
      
      {charts.length === 0 ? (
        <>
          <h2>Load Data Dashboard</h2>
          <p className="hint nes-text is-disabled">Upload a CSV file directly...</p>
          <div className="stack" style={{ marginTop: '10px', marginBottom: '20px' }}>
            <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={onUpload} />
            <button className={`nes-btn ${loadingDemo ? "is-disabled" : "is-warning"}`} onClick={() => fileInputRef.current.click()} disabled={loadingDemo}>
              {loadingDemo ? "Processing..." : "Select CSV File to Upload"}
            </button>
          </div>

          <p className="hint nes-text is-disabled">...or Use a Google Sheet CSV URL (leave blank for backend default).</p>
          <div className="stack" style={{ marginTop: '10px', marginBottom: '10px' }}>
            <input className="nes-input" type="url" placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0" value={csvUrl} onChange={(e) => setCsvUrl(e.target.value)} />
            <button className={`nes-btn ${loadingDemo ? "is-disabled" : "is-success"}`} onClick={onGenerateDemographics} disabled={loadingDemo}>
              {loadingDemo ? "Generating..." : "Scan from URL"}
            </button>
          </div>
          {demoStatus ? <p className="status nes-text is-warning">{demoStatus}</p> : null}
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h3>Detected {charts.length} Data Columns</h3>
             <button className="nes-btn is-error" onClick={() => setCharts([])}>Reset Data</button>
          </div>

          <div className="chart-grid" style={{ display: 'flex', flexDirection: 'column', gap: '50vh', marginTop: '50px' }}>
            {charts.map((c) => {
              const maxVal = Math.max(1, ...c.data.map(d => d.value));
              // Ensure we have a reasonable y-axis step
              const yAxisSteps = [0, Math.ceil(maxVal * 0.25), Math.ceil(maxVal * 0.5), Math.ceil(maxVal * 0.75), maxVal];
              
              return (
                <div key={c.column} style={{ 
                  width: '100%', 
                  height: '80vh', 
                  backgroundColor: '#000', 
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '20px 40px 60px 80px', // Extra left padding for Y-axis, bottom for X-axis
                  boxSizing: 'border-box',
                  border: '4px solid #fff'
                }}>
                  <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: '40px', fontSize: '2rem', textTransform: 'capitalize' }}>
                    {c.title}
                  </h2>

                  {/* Y-axis labels */}
                  <div style={{ position: 'absolute', left: '10px', top: '100px', bottom: '60px', display: 'flex', flexDirection: 'column-reverse', justifyContent: 'space-between', color: '#fff', fontSize: '1rem', width: '60px', alignItems: 'flex-end', paddingRight: '10px' }}>
                    {yAxisSteps.map((step, i) => (
                      <span key={i}>{step}</span>
                    ))}
                  </div>
                  
                  {/* Y-axis line */}
                  <div style={{ position: 'absolute', left: '80px', top: '100px', bottom: '60px', width: '2px', backgroundColor: '#fff' }} />
                  {/* X-axis line */}
                  <div style={{ position: 'absolute', left: '80px', right: '40px', bottom: '60px', height: '2px', backgroundColor: '#fff' }} />

                  {/* Bars container */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', position: 'relative', zIndex: 1, marginLeft: '10px', overflowX: 'auto', overflowY: 'hidden' }}>
                    {c.data.map(item => {
                        const heightPct = maxVal === 0 ? 0 : (item.value / maxVal) * 100;
                        return (
                          <div 
                            key={item.label} 
                            style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              alignItems: 'center', 
                              height: '100%', 
                              justifyContent: 'flex-end',
                              flex: 1,
                              minWidth: '50px', // Prevent bars from getting too squished in large datasets
                              margin: '0 10px',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleBarClick(c.column, item.label)}
                          >
                            <div style={{ 
                               width: '100%', 
                               maxWidth: '120px', 
                               height: `${Math.max(1, heightPct)}%`, 
                               backgroundColor: '#d32f2f', // Red bars like the image
                               position: 'relative',
                               transition: 'height 0.3s',
                               border: '2px solid rgba(0,0,0,0.5)'
                            }}>
                              <div style={{ position: 'absolute', top: '-30px', width: '100%', textAlign: 'center', color: '#fff', fontSize: '1.2rem' }}>
                                {item.value}
                              </div>
                            </div>
                            <div style={{ 
                              marginTop: '20px', 
                              color: '#fff', 
                              fontSize: '1rem', 
                              textAlign: 'center',
                              wordWrap: 'break-word',
                              maxWidth: '100%',
                              lineHeight: '1.2'
                            }}>
                              {item.label}
                            </div>
                          </div>
                        )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {selectedDetail && (
        <dialog className="nes-dialog is-dark is-rounded" open style={{ position: 'fixed', top: '5%', left: '50%', transform: 'translateX(-50%)', zIndex: 100, width: '90%', maxWidth: '800px', maxHeight: '85vh', overflowY: 'auto' }}>
          <form method="dialog">
            <h3 className="title nes-text is-primary">
              [{selectedDetail.column}] : {selectedDetail.label} ({selectedDetail.rows.length} records)
            </h3>
            <div className="nes-table-responsive" style={{ marginTop: '15px' }}>
              <table className="nes-table is-bordered is-dark" style={{ fontSize: '10px', width: '100%' }}>
                <thead>
                  <tr>
                    {Object.keys(selectedDetail.rows[0] || {}).slice(0, 5).map(col => <th key={col}>{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {selectedDetail.rows.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).slice(0, 5).map((val, idx) => <td key={idx}>{val == null ? '-' : String(val)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <menu className="dialog-menu" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="nes-btn is-error" onClick={(e) => { e.preventDefault(); setSelectedDetail(null); }}>Close Panel</button>
            </menu>
          </form>
        </dialog>
      )}
    </section>
  );
}

function NavMenu() {
  const location = useLocation();
  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
      <Link to="/">
        <button className={`nes-btn`} style={{ backgroundColor: location.pathname === '/' ? '#ff4d6d' : '#ffffff', color: location.pathname === '/' ? '#ffffff' : '#000000' }}>AI Roast</button>
      </Link>
      <Link to="/demographics">
        <button className={`nes-btn`} style={{ backgroundColor: location.pathname === '/demographics' ? '#ff4d6d' : '#ffffff', color: location.pathname === '/demographics' ? '#ffffff' : '#000000' }}>Demographics Graphs</button>
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="page-bg">
        <div className="scanlines" />
        <main className="wrapper">
          <header className="nes-container with-title is-dark hero" style={{ textAlign: "center" }}>
            <p className="title nes-text is-primary">TECH ROAST SHOW // ORA SYSTEM</p>
            <h1>ORA COMMAND CONSOLE</h1>
          </header>

          <NavMenu />

          <Routes>
            <Route path="/" element={<RoastPage />} />
            <Route path="/demographics" element={<DemographicsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
