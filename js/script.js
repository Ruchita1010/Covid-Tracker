import 'https://api.mapbox.com/mapbox-gl-js/v2.1.1/mapbox-gl.js';

const mapboxToken = config.MAPBOX_TOKEN;
mapboxgl.accessToken = mapboxToken;

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v10',
    center: [78.9629, 20.5937], // [lng, lat]
    zoom: 1, // zoom extent
    minZoom: 1
});

//On map load
map.on('load', () => {
    //adding a layer containing the tileset which was uploaded
    map.addLayer({
        id: 'countries', //the name of our layer, which we will need later
        source: {
            type: 'vector',
            url: `mapbox://${config.MAP_ID}`, // <--- Added the Map ID which was copied
        },
        'source-layer': 'ne_10m_admin_0_countries-5y3l21', // <--- Added the source layer name which was copied 
        type: 'fill',
        paint: {
            'fill-color': '#375e5e',
            'fill-outline-color': '#31ecec',
            'fill-opacity': 0.5
        },
    });
});


//On clicking a region on map
map.on('click', 'countries', (mapElement) => {
    const countryCode = mapElement.features[0].properties.ADM0_A3_IS; // Grabbing the country code from the map properties.

    fetch(`https://disease.sh/v3/covid-19/countries/${countryCode}`)
        .then(res => {
            return res.json();
        })
        .then(data => {
            // popup HTML segment
            const html = ` 
                    <h5>${data.country}</h5>
                    <p>cases: ${data.cases}</p>
                    <p>recovered: ${data.recovered}</p>
                    <p>deaths: ${data.deaths}</p>
            `;
            new mapboxgl.Popup() //Creating a new popup
                .setLngLat(mapElement.lngLat) // Setting where we want it to appear (where we clicked)
                .setHTML(html) // Adding the HTML segment
                .addTo(map); // Adding the popup to the map
        });
});


// populating the table 
const fillTableContent = async () => {
    try {
        const res = await fetch(`https://disease.sh/v3/covid-19/countries`);
        const data = await res.json();

        const tableBody = document.querySelector("#table-body");

        data.forEach(element => {
            const { cases, country, deaths, recovered } = element;
            const tableRow = document.createElement("tr");
            tableRow.innerHTML = `
                            <td>${country}</td>
                            <td>${cases}</td>
                            <td>${recovered}</td>
                            <td>${deaths}</td>
                        `;
            tableBody.appendChild(tableRow);
        });
    }
    catch (err) {
        tableBody.innerHTML = ` <div id="err">
                <p>${err}</p>
            </div>`
    }
}


const searchCountry = (e) => {
    const countryName = e.target.value.toUpperCase();
    const table = document.querySelector("#table-body");
    const tableRows = table.getElementsByTagName("tr");
    const arr = Array.from(tableRows);

    arr.forEach(row => {
        const td = row.firstElementChild.innerText.toUpperCase();
        if (td.indexOf(countryName) > -1) {
            row.style.display = "";
        }
        else {
            row.style.display = "none";
        }
    });
}


const notificationData = () => {
    let result = prompt("Enter Your Country and case limit separated by a comma(,)");
    if (result !== null) {
        result = result.split(",");
        localStorage.clear();
        const resultObj = {
            "country": result[0],
            "cases": result[1]
        }
        localStorage.setItem("userData", JSON.stringify(resultObj));

        fetch(`https://disease.sh/v3/covid-19/countries/${result[0]}`)
            .then(res => {
                return res.json();
            })
            .then(data => {
                const totalCases = data.cases;
                if (data.cases > result[1]) {
                    showNotification(result, totalCases);
                }
            });
    }
    else {
        alert("You did not provide the necessary details!!");
    }
}


const askNotificationPermission = () => {
    Notification.requestPermission().then(permission => {
        if (Notification.permission === "granted") {
            notificationData();
        }
        else if (Notification.permission === "denied" || Notification.permission === "default") {
            alert("Permission not granted!!!");
        }
    });
}


// check if the browser supports notifications
const checkNotification = () => {
    if (!('Notification' in window)) {
        alert("This browser does not support notifications!!");
    }
    else {
        askNotificationPermission();
    }
}


const showNotification = (result, totalCases) => {
    const notification = new Notification("Message from CovidCare!", {
        body: `Cases have arised above ${result.cases} in the country ${result.country}!!!
Total cases are ${totalCases}`,
        icon: "https://img.icons8.com/pastel-glyph/48/31ecec/emoji-mask--v3.png"
    });

    notification.onclick = (e) => {
        window.location.href = "http://127.0.0.1:5500/index.html";
    }
}

const searchBox = document.querySelector("#search-box");
searchBox.addEventListener("input", searchCountry);
fillTableContent();

const notifyBtn = document.querySelector("#notify-btn");
notifyBtn.addEventListener("click", checkNotification);


const userData = localStorage.getItem("userData");
if (userData !== null) {
    window.addEventListener("load", () => {
        const userDataObj = JSON.parse(userData);
        fetch(`https://disease.sh/v3/covid-19/countries/${userDataObj.country}`)
        .then(res => {
            return res.json();
        })
        .then(data => {
            const totalCases = data.cases;
            if (totalCases > userDataObj.cases) {
                    showNotification(userDataObj, totalCases);
                }
            });
    });
}

