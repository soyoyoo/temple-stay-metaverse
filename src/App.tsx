/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MetaverseScene } from './metaverse/MetaverseScene';

export default function App() {
  const [selectedTempleId, setSelectedTempleId] = useState<'seocho' | 'mungyeong' | 'jukrim'>('mungyeong');

  return (
    <div className="w-screen h-screen overflow-hidden bg-stone-950 font-sans select-none">
      <MetaverseScene
        currentTempleId={selectedTempleId}
        onSelectTemple={setSelectedTempleId}
      />
    </div>
  );
}
