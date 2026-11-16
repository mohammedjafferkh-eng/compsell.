import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 1800})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto('http://localhost:8080', wait_until='networkidle')
        await page.get_by_role('link', name='Explore', exact=True).click()
        await page.wait_for_url('**/explore*')
        assert await page.get_by_role('dialog').count() == 0
        await page.get_by_role('link', name='Sell', exact=True).click()
        await page.wait_for_url('**/sell*')
        await page.get_by_label('Title', exact=True).fill('ESP32 guest listing test')
        await page.get_by_label('Price (₹ each)').fill('250')
        assert await page.get_by_role('dialog').count() == 0
        await page.get_by_role('button', name='Publish listing', exact=True).click()
        await page.get_by_role('dialog').wait_for()
        await page.screenshot(path='/tmp/browser/guest-listing/prompt.png')
        await page.get_by_role('button', name='Keep editing').click()
        assert await page.get_by_label('Title', exact=True).input_value() == 'ESP32 guest listing test'
        await page.get_by_role('button', name='Publish listing', exact=True).click()
        await page.get_by_role('link', name='Sign in / Sign up', exact=True).click()
        await page.wait_for_url('**/auth*')
        print('PASS: guest browsing, draft editing, publish-only prompt, dismiss preserves draft, sign-in link')
        print('Runtime errors:', errors)
        await browser.close()

asyncio.run(main())
