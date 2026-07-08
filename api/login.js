const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseKey);
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ message: "Method not allowed" });
    }

    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        message: "Vui lòng nhập tên đăng nhập và mật khẩu."
      });
    }

    const cleanUsername = username.trim().toLowerCase();

    const supabase = createSupabaseClient();

    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, password_hash")
      .eq("username", cleanUsername)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        message: "Không thể kiểm tra tài khoản.",
        detail: error.message
      });
    }

    if (!user) {
      return res.status(401).json({
        message: "Tên đăng nhập hoặc mật khẩu không đúng."
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Tên đăng nhập hoặc mật khẩu không đúng."
      });
    }

    return res.status(200).json({
      message: "Đăng nhập thành công.",
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server bị lỗi khi đăng nhập.",
      detail: error.message
    });
  }
};