import fetch from 'node-fetch';
async function run() {
  const res = await fetch('http://localhost:3000/api/config/global');
  const data = await res.json();
  console.log(data);
}
run();
