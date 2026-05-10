import asyncio, httpx, time

API_KEY = 'rnd_VuQknzreIyPRC5pqRrobI6rKczQ5'
HEADERS = {'Authorization': f'Bearer {API_KEY}', 'Accept': 'application/json'}

async def check():
    async with httpx.AsyncClient() as c:
        # Get services
        r = await c.get('https://api.render.com/v1/services', headers=HEADERS)
        services = r.json()
        
        for s in services:
            svc = s['service']
            print(f"Checking {svc['name']} ({svc['id']})")
            # Trigger deploy
            await c.post(f"https://api.render.com/v1/services/{svc['id']}/deploys", headers=HEADERS)
            
        print('Triggered deploys. Waiting for them to finish...')
        
        while True:
            all_live = True
            for s in services:
                svc = s['service']
                r2 = await c.get(f"https://api.render.com/v1/services/{svc['id']}/deploys", headers=HEADERS)
                deploys = r2.json()
                if deploys:
                    latest = deploys[0]['deploy']
                    status = latest['status']
                    print(f"{svc['name']}: {status}")
                    if status not in ['live', 'build_failed', 'canceled', 'deactivated']:
                        all_live = False
            
            if all_live:
                print('All deployments finished!')
                break
            time.sleep(10)

asyncio.run(check())
