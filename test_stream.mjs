async function testStream() {
  console.log('Sending request to node backend...');
  const res = await fetch('http://localhost:3002/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoUrl: 'https://github.com/JaskaranBedi1005/CodePilot' })
  });

  console.log('Status:', res.status);
  
  if (!res.body) {
    console.log('No body returned');
    return;
  }
  
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; 
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const obj = JSON.parse(line);
          console.log(`[STREAM EVENT] ${obj.status} (node: ${obj.node || 'N/A'})`);
        } catch(e) {
          console.log(`[JSON PARSE ERROR] line:`, line.substring(0, 100));
        }
      }
    }
  }
  
  if (buffer.trim()) {
      console.log(`[STREAM FINAL BUFFER LEFTOVER] ${buffer.substring(0, 100)}`);
  }
  
  console.log('Stream ended normally.');
}

testStream().catch(err => console.error('Error:', err));
