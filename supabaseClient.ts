
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oapsyuujnhyixhsidugf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_C235yfLqAJLn_BjIr9TxPQ_DL3GwuUn';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
