"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to configure a business." };
  }

  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const phone = formData.get("phone") as string;
  const address = formData.get("address") as string;
  const logoFile = formData.get("logo") as File | null;

  try {
    let logo_url = null;

    // 1. Create Business Record
    const { data: businessData, error: dbError } = await supabase
      .from('businesses')
      .insert({
        owner_id: user.id,
        name,
        type,
        address,
        phone,
        low_stock_threshold: 5
      })
      .select('id')
      .single();

    if (dbError) throw dbError;
    const businessId = businessData.id;

    // 2. Upload Logo if exists (checking size > 0 since empty FormData files often have size 0)
    if (logoFile && logoFile.size > 0) {
      const fileExt = logoFile.name.split('.').pop();
      const filePath = `${businessId}/logo.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, logoFile);
        
      if (!uploadError) {
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('logos')
          .getPublicUrl(filePath);
          
        logo_url = publicUrl;
        
        // Update the business record with the logo URL
        await supabase
          .from('businesses')
          .update({ logo_url })
          .eq('id', businessId);
      } else {
        console.error("Failed to upload logo:", uploadError);
      }
    }

    // 3. Update User Metadata (mark as onboarded)
    const { error: updateAuthError } = await supabase.auth.updateUser({
      data: { onboarded: true },
    });

    if (updateAuthError) {
      console.error("Failed to update user auth metadata:", updateAuthError);
    }

  } catch (err: any) {
    console.error("Onboarding transaction failed:", err);
    return { error: err.message || "Failed to save business profile." };
  }

  // Next steps
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
