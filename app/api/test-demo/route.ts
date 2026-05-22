export async function GET() {
  return Response.json({
    demo_mode: process.env.DEMO_MODE,
    node_env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}
