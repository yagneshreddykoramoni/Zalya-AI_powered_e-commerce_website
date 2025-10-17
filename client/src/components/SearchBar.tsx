
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mic, MicOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import SearchSuggestions from './SearchSuggestions';
import { useToast } from '@/hooks/use-toast';

const SearchBar: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Speech recognition setup
  const recognition = useRef<SpeechRecognition | null>(null);
  
  useEffect(() => {
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      // allow interim so we can show live suggestions while speaking
      recognition.current.interimResults = true;
      recognition.current.lang = 'en-US';
      
      if (recognition.current) {
        recognition.current.onresult = (event) => {
          // Combine interim results into a single transcript
          let interimTranscript = '';
          let finalTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
            } else {
              interimTranscript += result[0].transcript;
            }
          }

          // Show interim transcript while speaking
          if (interimTranscript && interimTranscript.trim().length > 0) {
            setQuery(interimTranscript);
            setShowSuggestions(true);
          }

          if (finalTranscript && finalTranscript.trim().length > 0) {
            setQuery(finalTranscript);
            // Submit search right away when final result available
            navigate(`/products?query=${encodeURIComponent(finalTranscript)}`);
            setShowSuggestions(false);
          }
        };

        recognition.current.onerror = (event: unknown) => {
          // Try to safely read error message
          interface ErrLike { error?: string }
          const maybeErr = (event && typeof event === 'object' && 'error' in event) ? (event as ErrLike) : undefined;
          const errMsg = maybeErr?.error;
          console.error('Speech recognition error', errMsg ?? event);
          setIsListening(false);
          toast({
            title: "Voice search failed",
            description: "Please try again or type your search",
            variant: "destructive",
          });
        };

        recognition.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, [navigate, toast]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowSuggestions(true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/products?query=${encodeURIComponent(query)}`);
      setShowSuggestions(false);
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
      setShowSuggestions(false);
    }
  };

  const toggleVoiceSearch = () => {
    if (isListening) {
      if (recognition.current) {
        recognition.current.stop();
      }
      setIsListening(false);
    } else {
      if (recognition.current) {
        recognition.current.start();
        setIsListening(true);
        toast({
          title: "Voice search activated",
          description: "Speak now...",
        });
      } else {
        toast({
          title: "Voice search not supported",
          description: "Your browser doesn't support voice search",
          variant: "destructive",
        });
      }
    }
  };

  // Add click outside handler
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={searchRef} className="relative flex-grow max-w-xl">
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
          <Input
            type="text"
            placeholder="Search products, brands, categories..."
            value={query}
            onChange={handleSearchChange}
            className="pl-10 pr-10 w-full"
            onFocus={() => setShowSuggestions(true)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 ${isListening ? 'text-red-500' : 'text-gray-400'}`}
            onClick={toggleVoiceSearch}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </Button>
        </div>
      </form>

      {showSuggestions && query.length > 0 && (
        <SearchSuggestions
          query={query}
          onSelect={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
};

export default SearchBar;
