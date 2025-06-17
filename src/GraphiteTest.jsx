import { useState, useEffect } from 'react';
import {useDetectRender} from 'font-detect-rhl';

export default function GraphiteTest() {

  const [testFont, setTestFont] = useState('');
  const [hasRunOnce, setHasRunOnce] = useState(false);

  const font = new FontFace("Pankosmia-GraphiteTest", "url(/webfonts/awami/AwamiNastaliq-Regular.woff2)", {
    style: "normal",
    weight: "normal",
  });

  document.fonts.add(font);
  
  async function check() {
    await font.load();
    setTestFont('Pankosmia-GraphiteTest');
  }

  useEffect ( () => {
    if (!hasRunOnce) {
      check();
      setHasRunOnce(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[hasRunOnce])

  const testFontArray = [{ name: testFont }];
  const renderType = useDetectRender({fonts:testFontArray});
  const isGraphite = renderType[0].detectedRender === 'RenderingGraphite';

  return isGraphite;
}