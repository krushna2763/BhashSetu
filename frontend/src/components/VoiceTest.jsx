import { useState } from 'react';
import { toast } from 'sonner';

const VoiceTest = () => {
  const [isTestRunning, setIsTestRunning] = useState(false);
  
  const runVoiceTest = async () => {
    setIsTestRunning(true);
    
    try {
      // Check if speech synthesis is supported
      if (!('speechSynthesis' in window)) {
        toast.error('Speech synthesis not supported in this browser');
        setIsTestRunning(false);
        return;
      }
      
      const voices = window.speechSynthesis.getVoices();
      console.log('Available voices:', voices.length);
      console.log('Voice details:', voices.map(v => ({
        name: v.name,
        lang: v.lang,
        localService: v.localService
      })));
      
      // Test basic speech synthesis
      const testText = "Hello, this is a voice quality test for Bhasha Setu";
      const utterance = new SpeechSynthesisUtterance(testText);
      utterance.lang = 'hi-IN';
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onstart = () => {
        console.log('Voice test started');
      toast.success('Voice test started - you should hear audio');
      };
      
      utterance.onend = () => {
        console.log('Voice test completed');
        toast.success('Voice test completed successfully!');
        setIsTestRunning(false);
      };
      
      utterance.onerror = (event) => {
        console.error('Voice test error:', event);
        toast.error(`Voice test failed: ${event.error}`);
        setIsTestRunning(false);
      };
      
      window.speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error('Voice test error:', error);
      toast.error('Voice test failed. Check browser compatibility.');
      setIsTestRunning(false);
    }
  };
  
  return (
    <div className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
      <h3 className="text-lg font-semibold mb-2">Voice Test Tool</h3>
      <p className="text-sm text-gray-600 mb-4">
        Test your browser's voice synthesis functionality and diagnose any issues.
      </p>
      
      <button
        onClick={runVoiceTest}
        disabled={isTestRunning}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isTestRunning ? 'Testing Voice...' : '🎵 Test Voice Quality'}
      </button>
      
      <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
        <h4 className="font-semibold mb-2">Test Results:</h4>
        <p>Check browser console for detailed voice information and test results.</p>
      </div>
    </div>
  );
};

export default VoiceTest;
