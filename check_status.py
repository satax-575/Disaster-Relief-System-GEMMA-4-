import asyncio, httpx
API_KEY = 'rnd_VuQknzreIyPRC5pqRrobI6rKczQ5'
HEADERS = {'Authorization': f'Bearer {API_KEY}', 'Accept': 'application/json'}
async def check():
    async with httpx.AsyncClient() as c:
        r = await c.get('https://api.render.com/v1/services', headers=HEADERS)
        services = r.json()
        for s in services:
            svc = s['service']
            r2 = await c.get(f"https://api.render.com/v1/services/{svc['id']}/deploys", headers=HEADERS)
            deploys = r2.json()
            if deploys:
                print(f"{svc['name']}: {deploys[0]['deploy']['status']}")
asyncio.run(check())
