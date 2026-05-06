import "./App.css";
import BhashaSetu from "./components/BhashaSetu";
import ErrorBoundary from "./components/ErrorBoundary";
import { Toaster } from "sonner";

function App() {
  return (
    <ErrorBoundary>
      <div className="App">
        <BhashaSetu />
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            style: { fontSize: "17px", borderRadius: "12px" },
          }}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;
