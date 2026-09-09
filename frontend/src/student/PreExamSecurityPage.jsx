import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { startAttempt } from '../services/examApiService';

const CHECK_STATE = { PENDING: 'pending', OK: 'ok', FAIL: 'fail' };

function CheckRow({ label, state, detail }) {
  const pillClass = state === CHECK_STATE.OK ? 'ok' : state === CHECK_STATE.FAIL ? 'fail' : 'pending';
  const pillText = state === CHECK_STATE.OK ? 'Ready' : state === CHECK_STATE.FAIL ? 'Blocked' : 'Not checked';
  return (
    <div className="pre-exam-check-row">
      <div>
        <div>{label}</div>
        {detail && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{detail}</div>}
      </div>
      <span className={`status-pill ${pillClass}`}>{pillText}</span>
    </div>
  );
}

export default function PreExamSecurityPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const mediaStreamRef = useRef(null);

  const [cameraState, setCameraState] = useState(CHECK_STATE.PENDING);
  const [micState, setMicState] = useState(CHECK_STATE.PENDING);
  const [fullscreenState, setFullscreenState] = useState(CHECK_STATE.PENDING);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);

  const requestMedia = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaStreamRef.current = stream;
      setCameraState(CHECK_STATE.OK);
      setMicState(CHECK_STATE.OK);
    } catch (err) {
      setCameraState(CHECK_STATE.FAIL);
      setMicState(CHECK_STATE.FAIL);
      setError(
        'Camera and microphone access is required for this examination. Please allow access in your browser and try again.'
      );
    }
  }, []);

  async function handleStart() {
    setError(null);

    if (cameraState !== CHECK_STATE.OK || micState !== CHECK_STATE.OK) {
      setError('Please complete the camera and microphone check before starting.');
      return;
    }

    setStarting(true);
    try {
      const res = await startAttempt(examId);
      const attemptId = res.data._id;

      // Stop the local preview stream — the exam screen (and, later, the
      // dedicated media/WebRTC layer for live proctoring) manages its own
      // media session from here.
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());

      const el = document.documentElement;
      try {
        if (el.requestFullscreen) await el.requestFullscreen();
        setFullscreenState(CHECK_STATE.OK);
      } catch (fsErr) {
        setFullscreenState(CHECK_STATE.FAIL);
        // Not fatal — the exam screen itself will keep prompting for
        // fullscreen and logs violations server-side either way.
      }

      navigate(`/exam/attempt/${attemptId}`);
    } catch (err) {
      setError(err.message || 'Could not start the examination');
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="page-container">
      <h1>Pre-Examination Security Check</h1>
      <p>Before you begin, please review the following instructions:</p>
      <ul style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
        <li>Close unnecessary browser windows/tabs and other applications</li>
        <li>Enable your camera and microphone when prompted</li>
        <li>Your examination will run in fullscreen mode</li>
        <li>Exiting fullscreen three times will automatically submit your examination</li>
        <li>Maintain a stable internet connection throughout</li>
      </ul>

      {error && <div className="error-text">{error}</div>}

      <div style={{ margin: '20px 0' }}>
        <CheckRow label="Camera" state={cameraState} />
        <CheckRow label="Microphone" state={micState} />
        <CheckRow label="Fullscreen mode" state={fullscreenState} detail="Will be requested when you start" />
      </div>

      {cameraState !== CHECK_STATE.OK && (
        <button className="btn-secondary" type="button" onClick={requestMedia} style={{ marginBottom: 16 }}>
          Check Camera &amp; Microphone
        </button>
      )}

      <div>
        <button className="btn-primary" type="button" onClick={handleStart} disabled={starting}>
          {starting ? 'Starting…' : 'Start Examination'}
        </button>
      </div>
    </div>
  );
}
