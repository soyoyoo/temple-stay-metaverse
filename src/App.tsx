/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { MetaverseScene } from './metaverse/MetaverseScene';

export default function App() {
  const [selectedTempleId, setSelectedTempleId] = useState<'seocho' | 'mungyeong' | 'jukrim'>('mungyeong');

  return (
    <div className="w-screen h-dvh overflow-hidden bg-stone-950 font-sans select-none">
      <MetaverseScene
        currentTempleId={selectedTempleId}
        onSelectTemple={setSelectedTempleId}
      />
      <Analytics />
    </div>
  );
}
