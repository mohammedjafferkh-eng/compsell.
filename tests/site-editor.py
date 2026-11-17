"""Regression checks: guest editing denied; designated founder editing and logo publishing allowed."""
import asyncio
import json
import os
from pathlib import Path
from PIL import Image
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
        if os.environ.get("LOVABLE_BROWSER_AUTH_STATUS") == "injected":
            minted = {"storage_key": os.environ["LOVABLE_BROWSER_SUPABASE_STORAGE_KEY"], "session": json.loads(os.environ["LOVABLE_BROWSER_SUPABASE_SESSION_JSON"])}
        else:
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

            # Both images are optional: remove, save, reload, and read back null values.
            for label in ["site logo", "founder photo"]:
                remove = page.get_by_role("button", name="Delete " + label, exact=True)
                if await remove.count():
                    await remove.click()
            await page.get_by_role("button", name="Save changes", exact=True).click()
            await page.get_by_text("Site updated", exact=True).wait_for()
            await page.reload(wait_until="networkidle")
            optional = await page.evaluate("""async () => {
              const {supabase}=await import('/src/integrations/supabase/client.ts');
              const {data,error}=await supabase.from('site_settings').select('logo_path,founder_photo').eq('id','main').single();
              if(error) throw error;
              return data;
            }""")
            assert optional == {"logo_path": None, "founder_photo": None}, optional

            fixture = Path('/tmp/browser/site-editor/optional-branding.png')
            fixture.parent.mkdir(parents=True, exist_ok=True)
            Image.new('RGB', (80,80), 'green').save(fixture)
            for field, label in [('logo_path','site logo'), ('founder_photo','founder photo')]:
                await page.locator('#'+field).set_input_files(str(fixture))
                await page.get_by_role('button', name='Replace '+label, exact=True).wait_for()
                await page.get_by_role('button', name='Save changes', exact=True).wait_for(state='visible')
                await page.wait_for_function("() => !document.querySelector('button[type=submit]').disabled")
                # Re-selecting the same file must create a replacement rather than silently doing nothing.
                previous = await page.get_by_role('img', name=label, exact=False).last.get_attribute('src')
                await page.locator('#'+field).set_input_files(str(fixture))
                await page.wait_for_function("() => !document.querySelector('button[type=submit]').disabled")
                await page.wait_for_function("([label,previous]) => [...document.images].some(img => img.alt.toLowerCase()===label && img.src!==previous && img.complete && img.naturalWidth===80)", arg=[label,previous])
            await page.get_by_role('button', name='Save changes', exact=True).click()
            await page.get_by_text('Site updated', exact=True).wait_for()
            await page.reload(wait_until='networkidle')
            for label in ['Site logo','Founder photo']:
                image = page.get_by_role('img', name=label, exact=True)
                await image.wait_for()
                assert await image.evaluate('img=>img.complete && img.naturalWidth===80')
            await page.screenshot(path='/tmp/browser/site-editor/with-images.png')
            await page.get_by_role('button', name='Delete site logo', exact=True).click()
            await page.get_by_role('button', name='Delete founder photo', exact=True).click()
            await page.get_by_role('button', name='Save changes', exact=True).click()
            await page.get_by_text('Site updated', exact=True).wait_for()
            await page.reload(wait_until='networkidle')
            assert await page.get_by_role('button', name='Delete site logo', exact=True).count() == 0
            assert await page.get_by_role('button', name='Delete founder photo', exact=True).count() == 0
            await page.screenshot(path='/tmp/browser/site-editor/without-images.png')
        finally:
            await page.evaluate("""async ({original,path})=>{
              const {supabase}=await import('/src/integrations/supabase/client.ts');
              const restore=await supabase.from('site_settings').update(original).eq('id','main');
              if(restore.error) throw restore.error;
              const remove=await supabase.storage.from('site-branding').remove([path]);
              if(remove.error) throw remove.error;
            }""",result)
        print("PASS: guest editing denied; owner can add, replace the same file, delete both images and save without uploads; changes survive reload; public logo renders; original settings restored.")
        await browser.close()


asyncio.run(main())