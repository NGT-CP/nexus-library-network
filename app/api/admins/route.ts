import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    // 1. Look for the VIP Pass (Token) from the frontend
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return NextResponse.json({ error: 'Stop right there. Missing VIP Pass.' }, { status: 401 });
    }

    // 2. THE BOUNCER: Verify the token belongs to a real logged-in user
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return NextResponse.json({ error: 'Fake VIP Pass. Access Denied.' }, { status: 401 });
    }

    // 3. THE VAULT: Now that they passed security, use the Master Key to get the data
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send the data back safely
    return NextResponse.json(data.users);
}