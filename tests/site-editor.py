"""Regression checks: guest editing denied; designated founder editing and logo publishing allowed."""
import asyncio
import json
import os
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        await page.goto("http://localhost:8080/site-settings", wait_until="networkidle")
        guest = await page.evaluate("""async () => {
          const {supabase} = await import('/src/integrations/supabase/client.ts');
          const role = await supabase.rpc('can_edit_site');
          const write = await supabase.from('site_settings').upsert({id:'main', founder_name:'Unauthorized'});
          const upload = await supabase.storage.from('site-branding').upload('guest/test.png', new Blob(['test'],{type:'image/png'}));
          return {allowed:role.data, writeDenied:!!write.error, uploadDenied:!!upload.error};
        }""")
        assert guest == {"allowed": False, "writeDenied": True, "uploadDenied": True}, guest
        with open(os.path.expanduser("~/.cache/lovable-auth/session.json")) as f:
            minted = json.load(f)
        assert minted["session"]["user"]["email"].lower() == "mohammedjafferkh@gmail.com"
        await page.evaluate("([k,v]) => localStorage.setItem(k,v)", [minted["storage_key"], json.dumps(minted["session"])])
        await page.goto("http://localhost:8080/site-settings", wait_until="networkidle")
        await page.get_by_label("Founder name", exact=True).wait_for()
        result = await page.evaluate("""async () => {
          const {supabase} = await import('/src/integrations/supabase/client.ts');
          const {data: original} = await supabase.from('site_settings').select('*').eq('id','main').single();
          const {data: auth} = await supabase.auth.getUser();
          const canvas=document.createElement('canvas'); canvas.width=64; canvas.height=64;
          const ctx=canvas.getContext('2d'); ctx.fillStyle='blue'; ctx.fillRect(0,0,64,64);
          const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
          const path=auth.user.id+'/'+crypto.randomUUID()+'.png';
          const upload=await supabase.storage.from('site-branding').upload(path,blob);
          if(upload.error) throw upload.error;
          const write=await supabase.from('site_settings').update({logo_path:path}).eq('id','main');
          if(write.error) throw write.error;
          return {original, path};
        }""")
        try:
            await page.reload(wait_until="networkidle")
            await page.get_by_role("img", name="compsell logo", exact=True).wait_for()
            assert await page.get_by_role("img", name="compsell logo", exact=True).evaluate("img=>img.complete && img.naturalWidth===64")
            guest_context = await browser.new_context(viewport={"width": 1280, "height": 1800})
            public = await guest_context.new_page()
            await public.goto("http://localhost:8080", wait_until="networkidle")
            await public.get_by_role("img", name="compsell logo", exact=True).wait_for()
            assert await public.get_by_role("img", name="compsell logo", exact=True).evaluate("img=>img.complete && img.naturalWidth===64")
            await guest_context.close()
        finally:
            await page.evaluate("""async ({original,path})=>{
              const {supabase}=await import('/src/integrations/supabase/client.ts');
              const restore=await supabase.from('site_settings').update(original).eq('id','main');
              if(restore.error) throw restore.error;
              const remove=await supabase.storage.from('site-branding').remove([path]);
              if(remove.error) throw remove.error;
            }""",result)
        print("PASS: guests cannot edit or upload; designated owner can publish a logo; signed-out visitors see it; original settings restored.")
        await browser.close()


asyncio.run(main())