let healthCheck = async () => {
    try {
        let res = await fetch('http://localhost:3000/health')
        console.log(await res.json())
    } catch (e) {
        console.error(e);
        throw new Error("Error QuiX: ", e)
    }
}

await healthCheck()