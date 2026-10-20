export const unauthorized = () =>
  Response.json({ error: 'Требуется авторизация' }, { status: 401 });

export const forbidden = (error = 'Доступ запрещён') => Response.json({ error }, { status: 403 });
