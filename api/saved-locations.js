const { createClient } = require("@supabase/supabase-js");

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
    const supabase = createSupabaseClient();

    if (req.method === "GET") {
      const userId = req.query.user_id;

      if (!userId) {
        return res.status(400).json({
          message: "Thiếu user_id."
        });
      }

      const { data, error } = await supabase
        .from("saved_locations")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(10);

      if (error) {
        return res.status(500).json({
          message: "Không thể lấy danh sách vị trí.",
          detail: error.message
        });
      }

      return res.status(200).json({
        data
      });
    }

    if (req.method === "DELETE") {
      const { user_id, id } = req.body || {};

      if (!user_id || !id) {
        return res.status(400).json({
          message: "Thiếu user_id hoặc id."
        });
      }

      const { error } = await supabase
        .from("saved_locations")
        .delete()
        .eq("user_id", user_id)
        .eq("id", id);

      if (error) {
        return res.status(500).json({
          message: "Không thể xóa vị trí.",
          detail: error.message
        });
      }

      return res.status(200).json({
        message: "Đã xóa vị trí."
      });
    }

    res.setHeader("Allow", "GET, DELETE");

    return res.status(405).json({
      message: "Method not allowed"
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server chưa cấu hình Supabase hoặc bị lỗi.",
      detail: error.message
    });
  }
};