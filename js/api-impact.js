export async function getImpactData() {
  const response = await fetch("http://127.0.0.1:8000/api/");
  return await response.json();
}
