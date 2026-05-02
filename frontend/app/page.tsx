'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import TabSwitcher from '@/components/TabSwitcher';
import Level1 from '@/components/Level1/Level1';
import Level2Enhanced from '@/components/Level2/Level2Enhanced';
import Level3 from '@/components/Level3/Level3';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'level1' | 'level2' | 'level3'>('level3');

  return (
    <main className="min-h-screen relative">
      <Header />
      <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />
      
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="relative z-10"
        >
          {activeTab === 'level1' ? <Level1 /> : activeTab === 'level2' ? <Level2Enhanced /> : <Level3 />}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
