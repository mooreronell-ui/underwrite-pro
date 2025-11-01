// ============================================================
// SUPABASE JWT AUTHENTICATION MIDDLEWARE
// ============================================================
// Verifies Supabase JWT tokens on protected routes
// Attaches authenticated user to req.user

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

module.exports = async function supabaseAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!token) {
      return res.status(401).json({ 
        error: 'NO_TOKEN', 
        message: 'Authorization token required' 
      });
    }
    
    if (!supabase) {
      console.error('Supabase not configured - missing SUPABASE_URL or SUPABASE_ANON_KEY');
      return res.status(500).json({ 
        error: 'SUPABASE_NOT_CONFIGURED',
        message: 'Authentication service not available'
      });
    }
    
    // Verify token with Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data?.user) {
      console.error('Supabase auth failed:', error?.message || 'No user data');
      return res.status(401).json({ 
        error: 'INVALID_TOKEN', 
        message: 'Invalid or expired authentication token' 
      });
    }
    
    // Attach authenticated user to request
    req.user = data.user;
    req.userId = data.user.id;
    req.userEmail = data.user.email;
    
    console.log(`✓ Authenticated user: ${data.user.email} (${data.user.id})`);
    
    next();
  } catch (e) {
    console.error('supabaseAuth error:', e.message);
    return res.status(500).json({ 
      error: 'AUTH_ERROR', 
      message: 'Authentication verification failed' 
    });
  }
};
