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

    if (cleanUsername.length < 3) {
      return res.status(400).json({
        message: "Tên đăng nhập phải có ít nhất 3 ký tự."
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        message: "Mật khẩu phải có ít nhất 4 ký tự."
      });
    }

    const supabase = createSupabaseClient();

    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("username", cleanUsername)
      .maybeSingle();

    if (checkError) {
      return res.status(500).json({
        message: "Không thể kiểm tra tài khoản.",
        detail: checkError.message
      });
    }

    if (existingUser) {
      return res.status(409).json({
        message: "Tên đăng nhập đã tồn tại."
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([
        {
          username: cleanUsername,
          password_hash: passwordHash
        }
      ])
      .select("id, username")
      .single();

    if (insertError) {
      return res.status(500).json({
        message: "Không thể tạo tài khoản.",
        detail: insertError.message
      });
    }

    return res.status(201).json({
      message: "Đăng ký thành công.",
      user: newUser
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server bị lỗi khi đăng ký.",
      detail: error.message
    });
  }
};