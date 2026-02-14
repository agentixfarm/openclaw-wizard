import { useState, useEffect, useRef } from 'react';
import { api } from './api/client';
import { WebSocketClient } from './api/websocket';
import type { SystemInfo } from './types/SystemInfo';
import './App.css';

function App() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<string>('disconnected');
  const [wsMessages, setWsMessages] = useState<string[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const wsClient = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    // Fetch system info on mount
    api.getSystemInfo()
      .then(setSystemInfo)
      .catch((err) => setError(err.message));

    // Initialize WebSocket client
    wsClient.current = new WebSocketClient();

    const unsubscribeStatus = wsClient.current.onStatusChange((status) => {
      setWsStatus(status);
    });

    const unsubscribeMessages = wsClient.current.onMessage((data) => {
      setWsMessages((prev) => [...prev, data]);
    });

    wsClient.current.connect();

    // Cleanup on unmount
    return () => {
      unsubscribeStatus();
      unsubscribeMessages();
      wsClient.current?.disconnect();
    };
  }, []);

  const sendMessage = () => {
    if (messageInput.trim() && wsClient.current) {
      wsClient.current.send(messageInput);
      setMessageInput('');
    }
  };

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!systemInfo) {
    return (
      <div style={{ padding: '20px' }}>
        <p>Connecting to backend...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>OpenClaw Wizard</h1>

      <section style={{ marginBottom: '30px' }}>
        <h2>System Information</h2>
        <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: '500px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><strong>OS:</strong></td>
              <td style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>{systemInfo.os}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><strong>Architecture:</strong></td>
              <td style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>{systemInfo.arch}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><strong>Node.js:</strong></td>
              <td style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>
                {systemInfo.node_version || 'Not installed'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px', borderBottom: '1px solid #ccc' }}><strong>OpenClaw:</strong></td>
              <td style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>
                {systemInfo.openclaw_installed ? 'Installed' : 'Not installed'}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>WebSocket</h2>
        <p>
          <strong>Status:</strong>{' '}
          <span
            style={{
              color:
                wsStatus === 'connected'
                  ? 'green'
                  : wsStatus === 'connecting' || wsStatus === 'reconnecting'
                  ? 'orange'
                  : 'red',
            }}
          >
            {wsStatus}
          </span>
        </p>

        <div style={{ marginTop: '10px' }}>
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            style={{
              padding: '8px',
              width: '300px',
              marginRight: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
            disabled={wsStatus !== 'connected'}
          />
          <button
            onClick={sendMessage}
            disabled={wsStatus !== 'connected'}
            style={{
              padding: '8px 16px',
              backgroundColor: wsStatus === 'connected' ? '#007bff' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: wsStatus === 'connected' ? 'pointer' : 'not-allowed',
            }}
          >
            Send
          </button>
        </div>

        {wsMessages.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3>Messages:</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {wsMessages.map((msg, idx) => (
                <li
                  key={idx}
                  style={{
                    padding: '8px',
                    marginBottom: '5px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                  }}
                >
                  {msg}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
