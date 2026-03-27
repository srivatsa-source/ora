import { useMemo, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";

const initialResult = {
  roast: "",
  verdict: ""
};

function RoastPage() {
  const [name, setName] = useState("");
  const [project, setProject] = useState("");
  const [stack, setStack] = useState("");
  const [defense, setDefense] = useState("");
  
  const [judging, setJudging] = useState(false);
  const [judgeResult, setJudgeResult] = useState(initialResult);
  const [revealedVerdict, setRevealedVerdict] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [judgeError, setJudgeError] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks to turn off the microphone light
        stream.getTracks().forEach(track => track.stop());

        setTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("file", audioBlob, "recording.webm");
          
          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: formData
          });

          if (!res.ok) throw new Error("Transcription failed.");

          const data = await res.json();
          if (data.text) {
            setDefense(prev => prev ? prev + " " + data.text : data.text);
          }
        } catch (err) {
          console.error("STT Error:", err);
          setJudgeError("Microphone processing failed: " + String(err));
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied:", err);
      setJudgeError("Could not access microphone.");
    }
  };

  const verdictClass = useMemo(() => {
    if (revealedVerdict === "STAY") return "nes-text is-success";
    if (revealedVerdict === "KICK") return "nes-text is-error";
    return "nes-text is-warning";
  }, [revealedVerdict]);

  async function onJudge(e) {
    e.preventDefault();
    setJudging(true);
    setJudgeError("");
    setJudgeResult(initialResult);
    setRevealedVerdict("");
    setAudioUrl("");

    const combinedPitch = `Name: ${name}\nProject: ${project}\nTech Stack: ${stack}\nDefense: ${defense}`;

    try {
      const response = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pitch_text: combinedPitch,
          include_tts_audio: true
        })
      });

      if (!response.ok) {
        throw new Error("Judge API failed");
      }

      const data = await response.json();
      setJudgeResult(data.result || initialResult);

      if (data.audio_base64 && data.audio_mime) {
        const bytes = atob(data.audio_base64);
        const arr = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i += 1) {
          arr[i] = bytes.charCodeAt(i);
        }
        const blob = new Blob([arr], { type: data.audio_mime });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      }
    } catch (err) {
      setJudgeError(String(err));
    } finally {
      setJudging(false);
    }
  }

  // Determine which face to show based on state
  let currentFace = "( -_- )";
  let faceColor = "#f4efe6";
  
  if (judging) {
    currentFace = "( ¬_¬ )";
    faceColor = "#f7c948";
  } else if (judgeResult.roast && !revealedVerdict) {
    currentFace = "( <_> )"; // Listening / speaking face
    faceColor = "#4ea8de";
  } else if (revealedVerdict === "STAY") {
    currentFace = "( ⌐■_■ )";
    faceColor = "#7bd389";
  } else if (revealedVerdict === "KICK") {
    currentFace = "( ಠ_ಠ )";
    faceColor = "#ff4d6d";
  }

  return (
    <section className="nes-container is-dark with-title grid-2" style={{ marginTop: '20px' }}>
      <p className="title">Hackathon Roast</p>
      <div className="nes-container is-rounded is-dark">
        <h2>Victim Profile</h2>
        <form onSubmit={onJudge} className="stack">
          
          <div className="nes-field">
            <label htmlFor="name_field" style={{ color: "#f7c948" }}>Participant Name</label>
            <input type="text" id="name_field" className="nes-input is-dark" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Chad Founder" />
          </div>

          <div className="nes-field">
            <label htmlFor="project_field" style={{ color: "#f7c948" }}>Idea / Project</label>
            <input type="text" id="project_field" className="nes-input is-dark" value={project} onChange={(e) => setProject(e.target.value)} required placeholder="e.g. Tinder for Dogs" />
          </div>

          <div className="nes-field">
            <label htmlFor="stack_field" style={{ color: "#f7c948" }}>Tech Stack</label>
            <input type="text" id="stack_field" className="nes-input is-dark" value={stack} onChange={(e) => setStack(e.target.value)} required placeholder="e.g. React, Firebase, 18 APIs" />
          </div>

          <div className="nes-field">
            <label htmlFor="defense_field" style={{ color: "#f7c948", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Their Weak Defense</span>
              <button 
                type="button" 
                onClick={toggleRecording} 
                className={`nes-btn ${isRecording ? 'is-error' : 'is-success'}`}
                style={{ fontSize: "0.7rem", padding: "4px 8px" }}
                disabled={transcribing}
              >
                {transcribing ? "Transcribing..." : isRecording ? "⏹ Stop" : "🎤 Mic"}
              </button>
            </label>
            <textarea id="defense_field" className="nes-textarea is-dark" rows="3" value={defense} onChange={(e) => setDefense(e.target.value)} required placeholder="Why shouldn't we kick your team?" />
          </div>

          <button className={`nes-btn ${judging || !name.trim() || !project.trim() ? "is-disabled" : "is-primary"}`} type="submit" disabled={judging || !name.trim() || !project.trim()}>
            {judging ? "Processing..." : "Generate Roast"}
          </button>
        </form>
        {judgeError ? <p className="nes-text is-error">{judgeError}</p> : null}
      </div>

      <div className="result-panel nes-container is-rounded is-dark">
        <h2>System Output</h2>
        <div style={{ textAlign: "center", marginBottom: "20px", marginTop: "20px" }}>
          <pre className="face-visual" style={{ color: faceColor, transition: "color 0.4s" }}>
            {currentFace}
          </pre>
        </div>
        
        <div style={{ minHeight: "100px", marginBottom: "20px" }}>
          <p style={{ lineHeight: "1.6" }}>
            <strong>Roast:</strong> {judgeResult.roast || "Waiting for target..."}
          </p>
        </div>

        <div style={{ textAlign: "center", minHeight: "60px" }}>
          <p className={`verdict ${verdictClass}`} style={{ fontSize: "2rem", letterSpacing: "4px" }}>
            {judgeResult.roast && !revealedVerdict ? "[ SUSPENSE... ]" : (revealedVerdict ? `[ ${revealedVerdict} ]` : "[ - ]")}
          </p>
        </div>

        {audioUrl ? (
          <audio 
            className="audio" 
            controls 
            autoPlay 
            src={audioUrl} 
            onEnded={() => setRevealedVerdict(judgeResult.verdict)}
          />
        ) : (
          <p className="hint nes-text is-disabled" style={{ textAlign: "center" }}>Audio will auto-play upon judging...</p>
        )}
      </div>
    </section>
  );
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

          <div className="chart-grid" style={{ marginTop: '20px' }}>
            {charts.map((c) => {
              const maxVal = Math.max(...c.data.map(d => d.value));
              return (
                <div className="chart-card nes-container is-rounded is-dark" key={c.column}>
                  <p style={{ color: "#f7c948", fontSize: "14px", marginBottom: "15px" }}>[{c.title}]</p>
                  {c.data.map(item => {
                      const widthPct = (item.value / maxVal) * 100;
                      return (
                        <div 
                          key={item.label} 
                          style={{ cursor: 'pointer', marginBottom: '15px' }} 
                          onClick={() => handleBarClick(c.column, item.label)}
                          className="hover-bar"
                        >
                           <div style={{ display:'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
                              <span>{item.label}</span>
                              <span>{item.value}</span>
                           </div>
                           <div style={{ width: '100%', backgroundColor: '#111', height: '20px', border: '2px solid #333' }}>
                              <div style={{ width: `${widthPct}%`, backgroundColor: c.color, height: '100%', transition: 'width 0.3s' }} />
                           </div>
                        </div>
                      )
                  })}
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
        <button className={`nes-btn ${location.pathname === '/' ? 'is-primary' : ''}`}>AI Roast</button>
      </Link>
      <Link to="/demographics">
        <button className={`nes-btn ${location.pathname === '/demographics' ? 'is-primary' : ''}`}>Demographics Graphs</button>
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
