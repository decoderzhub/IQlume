import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Menu, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface ChatHeaderProps {
  rightSidebarOpen: boolean;
  setRightSidebarOpen: (open: boolean) => void;
}

export function ChatHeader({ 
  rightSidebarOpen, 
  setRightSidebarOpen, 
}: ChatHeaderProps) {

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">BroNomics Ai</h1>
            <p className="text-sm sm:text-base text-gray-400">Your intelligent trading strategy assistant</p>
          </div>
        </div>
        
        {/* Right sidebar toggle */}
        <Button
          variant="ghost"
          onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
          className="p-2"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>
    </Card>
  );
}