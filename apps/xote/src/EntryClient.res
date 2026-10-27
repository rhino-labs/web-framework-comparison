// Hydrates the prerendered page with the data the server embedded.

%%raw(`import "@bench/content/styles.css"`)

let readPageData: unit => Content.pageData = %raw(`() => JSON.parse(document.getElementById('page-data').textContent)`)

let data = readPageData()
Hydration.hydrateById(() => <App.Page data />, "root")
