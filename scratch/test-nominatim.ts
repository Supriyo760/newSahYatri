async function test() {
  const dest = 'Varanasi';
  const lat = 25.3356491;
  const lon = 83.0076292;
  const delta = 0.08;
  const minLng = lon - delta;
  const maxLng = lon + delta;
  const minLat = lat - delta;
  const maxLat = lat + delta;

  const queries = ['tourism', 'tourist attraction', 'attraction', 'point of interest', 'museum'];

  for (const q of queries) {
    const params = new URLSearchParams({
      format: 'json',
      q,
      viewbox: `${minLng},${maxLat},${maxLng},${minLat}`,
      bounded: '1',
      limit: '10'
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'SahYatriApp/1.0' }
    });
    const data = await res.json();
    console.log(`Query: "${q}" -> count: ${data.length}`);
    if (data.length > 0) {
      console.log(`  First item: ${data[0].display_name}`);
    }
  }
}
test();
