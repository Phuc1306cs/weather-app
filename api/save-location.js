const { createClient } = require("@supabase/supabase-js");

const MAX_LOCATIONS_PER_USER = 10;

function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseKey);
}

function createLocationKey(city, country, latitude, longitude) {
  if (city && country) {
    return `${city}-${country}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  return `${Number(latitude).toFixed(4)}-${Number(longitude).toFixed(4)}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      message: "Method not allowed"
    });
  }

  try {
    const supabase = createSupabaseClient();

    const {
      user_id,
      city,
      country,
      display_address,
      latitude,
      longitude,
      temperature,
      humidity
    } = req.body || {};

    if (!user_id || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        message: "Thiếu user_id hoặc tọa độ vị trí."
      });
    }

    const locationKey = createLocationKey(city, country, latitude, longitude);

    const { data: existingLocation } = await supabase
      .from("saved_locations")
      .select("save_count")
      .eq("user_id", String(user_id))
      .eq("location_key", locationKey)
      .maybeSingle();

    const payload = {
      user_id: String(user_id),
      location_key: locationKey,
      city: city ? String(city) : null,
      country: country ? String(country) : null,
      display_address: display_address ? String(display_address) : null,
      latitude: Number(latitude),
      longitude: Number(longitude),
      temperature: temperature !== undefined ? Number(temperature) : null,
      humidity: humidity !== undefined ? Number(humidity) : null,
      save_count: existingLocation?.save_count
        ? existingLocation.save_count + 1
        : 1,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("saved_locations")
      .upsert(payload, {
        onConflict: "user_id,location_key"
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        message: "Không thể lưu vị trí.",
        detail: error.message
      });
    }

    const { data: allLocations } = await supabase
      .from("saved_locations")
      .select("id")
      .eq("user_id", payload.user_id)
      .order("updated_at", { ascending: false });

    if (allLocations && allLocations.length > MAX_LOCATIONS_PER_USER) {
      const oldLocationIds = allLocations
        .slice(MAX_LOCATIONS_PER_USER)
        .map((item) => item.id);

      await supabase
        .from("saved_locations")
        .delete()
        .in("id", oldLocationIds);
    }

    return res.status(200).json({
      message: "Đã lưu vị trí thành công.",
      data
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server chưa cấu hình Supabase hoặc bị lỗi.",
      detail: error.message
    });
  }
};