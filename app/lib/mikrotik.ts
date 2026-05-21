'use server';

export async function addMikrotikUser(
  phone: string,
  speedLimit: string
): Promise<{ success: boolean; error?: string }> {
  const mikrotikIp = process.env.MIKROTIK_IP;
  const mikrotikUser = process.env.MIKROTIK_USER;
  const mikrotikPass = process.env.MIKROTIK_PASS;

  if (!mikrotikIp || !mikrotikUser || !mikrotikPass) {
    return {
      success: false,
      error: 'MikroTik environment variables not configured',
    };
  }

  try {
    const basicAuth = Buffer.from(`${mikrotikUser}:${mikrotikPass}`).toString(
      'base64'
    );

    const rateLimitFormatted = `${speedLimit}/${speedLimit}`;

    const response = await fetch(
      `http://${mikrotikIp}/rest/ip/hotspot/user`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: phone,
          password: phone,
          'rate-limit': rateLimitFormatted,
          server: 'all',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `MikroTik API error: ${response.status} - ${errorText}`
      );
    }

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('MikroTik user creation failed:', message);
    return { success: false, error: message };
  }
}

export async function getMikrotikUserSpeed(
  phone: string
): Promise<{ upload: string; download: string } | null> {
  const mikrotikIp = process.env.MIKROTIK_IP;
  const mikrotikUser = process.env.MIKROTIK_USER;
  const mikrotikPass = process.env.MIKROTIK_PASS;

  if (!mikrotikIp || !mikrotikUser || !mikrotikPass) {
    return null;
  }

  try {
    const basicAuth = Buffer.from(`${mikrotikUser}:${mikrotikPass}`).toString(
      'base64'
    );

    const response = await fetch(
      `http://${mikrotikIp}/rest/ip/hotspot/user?name=${phone}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as Array<{
      name: string;
      'rate-limit'?: string;
    }>;

    if (data.length === 0) {
      return null;
    }

    const rateLimit = data[0]['rate-limit'] || '';
    const [upload, download] = rateLimit.split('/');

    return {
      upload: upload || 'N/A',
      download: download || 'N/A',
    };
  } catch (error) {
    console.error('Failed to fetch MikroTik user speed:', error);
    return null;
  }
}
