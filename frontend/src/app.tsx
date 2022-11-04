import { useEffect, useState } from 'preact/hooks';
import './app.scss';

enum MODE {
  BREAKOUT = 'breakout',
  STARS = 'stars',
  LINES = 'lines',
  GAME_OF_LIFE = 'gameoflife',
  NONE = '',
}

export function App() {
  const [triggerClear, setTriggerClear] = useState(false);
  const [isMouseDown, setMouseIsDown] = useState(false);
  const [removeLed, setRemoveLed] = useState(false);
  const [activeLeds, setActiveLeds] = useState<Record<number, number>>({});
  const [socket, setSocket] = useState<WebSocket>();
  const [mode, setMode] = useState<MODE>(MODE.NONE);

  const setLed = (index: number) => {
    setActiveLeds((state: any) => ({
      ...state,
      [index]: removeLed ? 0 : 1,
    }));

    socket?.send(
      JSON.stringify({
        event: 'led',
        i: index,
        s: removeLed ? 0 : 1,
      })
    );
  };

  const clear = () => {
    setActiveLeds({});
    setRemoveLed(false);
    setTriggerClear(!triggerClear);
    socket?.send(
      JSON.stringify({
        event: 'clear',
      })
    );
  };

  const sendMode = (mode: MODE) => {
    setMode(mode);
    socket?.send(
      JSON.stringify({
        event: 'mode',
        m: mode,
      })
    );
  };

  const persist = () => {
    socket?.send(
      JSON.stringify({
        event: 'persist',
      })
    );
  };

  useEffect(() => {
    if (socket) {
      socket.send(
        JSON.stringify({
          event: 'init',
        })
      );
    }
  }, [socket]);

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(
        `${
          (import.meta as any).PROD
            ? location.href.replace('http', 'ws')
            : import.meta.env.VITE_WS_URL
        }ws`
      );

      ws.onopen = () => {
        setSocket(ws);

        ws.onmessage = (event) => {
          if (event.data instanceof Blob) {
            // is blob
          } else {
            try {
              const json = JSON.parse(event.data);

              if (json.event === 'init') {
                json.data.forEach((v: number, i: number) => {
                  if (v) {
                    setLed(i);
                  }
                });
              }
            } catch {}
          }
        };

        ws.onclose = () => {
          setSocket(undefined);
          setTimeout(connect, 1000);
        };
      };

      ws.onerror = () => {
        setSocket(undefined);
        ws.close();
        ws.onopen = null;
      };
    }

    connect();

    () => {
      setSocket(undefined);
    };
  }, []);

  if (!socket?.OPEN) {
    return (
      <div className="wrapper">
        <div className="connection-information">connecting...</div>
      </div>
    );
  }

  return (
    <div className="wrapper">
      <div>
        <div className={`box ${mode !== MODE.NONE ? 'disabled' : ''}`}>
          <div
            className="grid"
            onPointerUp={() => {
              setMouseIsDown(false);
            }}
            onPointerLeave={() => {
              setMouseIsDown(false);
            }}
          >
            {[...new Array(256)].map((_, k) => (
              <div
                key={k}
                className="led"
                onPointerDown={() => {
                  setLed(k);
                  setMouseIsDown(true);
                }}
                onClick={() => setLed(k)}
                onPointerOver={() => {
                  if (isMouseDown) {
                    setLed(k);
                  }
                }}
              >
                <div className={`inner ${activeLeds[k] ? 'active' : ''}`}></div>
              </div>
            ))}
          </div>
          <div className="cable">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
        <div className="controls">
          <div>
            <button onClick={() => sendMode(MODE.STARS)}>stars</button>
            <button onClick={() => sendMode(MODE.LINES)}>lines</button>
            <button onClick={() => sendMode(MODE.BREAKOUT)}>breakout</button>
            <button onClick={() => sendMode(MODE.GAME_OF_LIFE)}>
              game of life
            </button>
          </div>

          <div>
            {mode === MODE.NONE ? (
              <>
                <button onClick={clear}>clear</button>
                <button onClick={persist}>persist</button>
                <button onClick={() => setRemoveLed(!removeLed)}>
                  {removeLed ? 'pencil' : 'eraser'}
                </button>
              </>
            ) : (
              <button onClick={() => sendMode(MODE.NONE)}>draw mode</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}