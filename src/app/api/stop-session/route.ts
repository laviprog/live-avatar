const API_URL = process.env.NEXT_PUBLIC_BASE_API_URL_HEYGEN!;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { session_token } = body;

    if (!session_token) {
      return new Response(JSON.stringify({ error: 'Токен сессии обязателен' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const res = await fetch(`${API_URL}/v1/sessions`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error('Error stopping session:', errorData);
      return new Response(
        JSON.stringify({
          error: 'Не удалось завершить сессию',
        }),
        {
          status: res.status,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Сессия успешно завершена',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error stopping session:', error);
    return new Response(JSON.stringify({ error: 'Не удалось завершить сессию' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
