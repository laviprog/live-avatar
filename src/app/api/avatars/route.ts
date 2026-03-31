const API_URL = process.env.NEXT_PUBLIC_BASE_API_URL_HEYGEN!;
const API_KEY = process.env.API_KEY_HEYGEN!;

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/v1/avatars`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY,
      },
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error('Error getting avatars data:', errorData);
      return new Response(
        JSON.stringify({
          error: errorData.data?.message || 'Failed to get avatars',
        }),
        {
          status: res.status,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(JSON.stringify((await res.json()).data.results), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error getting avatars data:', error);
    return new Response(JSON.stringify({ error: 'Failed to get avatars' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
