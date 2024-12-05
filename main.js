const {app, Tray, Menu, nativeImage, Notification} = require('electron/main');
require('dotenv').config();

let store;

const initStore = async () => {
    const ElectronStore = await import('electron-store');
    store = new ElectronStore.default();
    return store;
};

let tray;
let fetchedData = {};
let lastNotifiedNamaz = null;
const notificationLeadTime = 10;

// const regionsWithDistricts = {
//     "Toshkent Viloyati": [
//         "Toshkent", "Bekоbоd", "Оlоt", "Yangibоzоr", "Angren", "Chirchiq"
//     ],
//     "Samarqand Viloyati": [
//         "Samarqand", "Kattaqo'rg'оn", "Urgut", "Zarafshоn"
//     ],
//     "Farg'ona Viloyati": [
//         "Farg'оna", "Marg'ilon", "Qo'qon", "Quva", "Rishton", "Shahrixon"
//     ],
//     "Namangan Viloyati": [
//         "Namangan", "Chоrt", "Pоp", "Uchqo'rg'оn", "Kosonsoy"
//     ],
//     "Buxoro Viloyati": [
//         "Buxoro", "Qоrоvulbоzоr", "Gazli", "Kоnimех"
//     ],
//     "Xorazm Viloyati": [
//         "Urganch", "Xiva", "Shоvоt", "Xazоrasp"
//     ],
//     "Qashqadaryo Viloyati": [
//         "Qarshi", "G'uzоr", "Dehqоnоbоd", "Kоsоn", "Muborak"
//     ],
//     "Surxondaryo Viloyati": [
//         "Termiz", "Denоv", "Sherоbоd", "Bоysun", "Qumqo'rg'оn"
//     ],
//     "Navoiy Viloyati": [
//         "Navoiy", "Nurоta", "Uchquduq", "Kеnimех"
//     ],
//     "Jizzax Viloyati": [
//         "Jizzах", "Arnasоy", "Zоmin", "Bоystоn"
//     ],
//     "Qoraqalpog'iston Respublikasi": [
//         "Nukus", "Mo'ynоq", "Taxtako'pir", "Xo'jayli", "Qo'ng'irоt"
//     ]
// };

const regionsWithDistricts = {
    "Toshkent Viloyati": [
        "Toshkent", "Angren"
    ],
    "Samarqand Viloyati": [
        "Samarqand",  "Urgut"
    ],
    "Farg'ona Viloyati": [
        "Marg'ilon", "Qo'qon", "Quva", "Rishton", "Shahrixon"
    ],
    "Namangan Viloyati": [
        "Namangan", "Kosonsoy"
    ],
    "Buxoro Viloyati": [
        "Buxoro", "Gazli"
    ],
    "Xorazm Viloyati": [
        "Urganch", "Xiva"
    ],
    "Qashqadaryo Viloyati": [
        "Qarshi", "Muborak"
    ],
    "Surxondaryo Viloyati": [
        "Termiz"
    ],
    "Navoiy Viloyati": [
        "Navoiy", "Uchquduq"
    ],
    "Qoraqalpog'iston Respublikasi": [
        "Nukus"
    ]
};

app.on("ready", async () => {
    await initStore();

    let currentRegion = store.get('selectedRegion', 'Toshkent');
    let currentDistrict = store.get('selectedDistrict', 'Toshkent') ;

    const icon = nativeImage.createFromDataURL('');
    tray = new Tray(icon);

    if (!currentRegion || !Object.keys(regionsWithDistricts).includes(currentRegion)) {
        currentRegion = 'Toshkent Viloyati';
        currentDistrict = 'Toshkent';

        store.set('selectedRegion', currentRegion);
        store.set('selectedDistrict', currentDistrict);
    }

    const namazTime = () => {
        const requestUrl = `https://islomapi.uz/api/present/day?region=${currentDistrict}`;
        console.log('Request URL:', requestUrl);

        fetch(requestUrl)
            .then(res => res.json())
            .then(data => {
                console.log(data);
                fetchedData = data;
                updateContextMenu();
            })
            .catch(err => console.error('Error', err));
    };

    const formatTime = (date) => {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    };

    const getNearestNamazTime = () => {
        if (!fetchedData.times) return null;
        const now = new Date();
        const times = fetchedData.times;
        const namazTimes = [
            {name: 'Saharlik', time: parseTime(times.tong_saharlik)},
            {name: 'Quyosh', time: parseTime(times.quyosh)},
            {name: 'Peshin', time: parseTime(times.peshin)},
            {name: 'Asr', time: parseTime(times.asr)},
            {name: 'Shom', time: parseTime(times.shom_iftor)},
            {name: 'Xufton', time: parseTime(times.hufton)}
        ];

        const upcomingNamaz = namazTimes.find(namaz => namaz.time > now);
        return upcomingNamaz || namazTimes[0];
    };

    const updateTime = () => {
        const nearestNamaz = getNearestNamazTime();
        if (nearestNamaz) {
            const now = new Date();
            tray.setTitle(`${nearestNamaz.name} - ${formatTime(nearestNamaz.time)}`);

            const timeDifference = (nearestNamaz.time - now) / 60000;
            if (timeDifference <= notificationLeadTime && nearestNamaz.name !== lastNotifiedNamaz) {
                new Notification({
                    title: 'Namoz vaqti',
                    body: `Ey mo'minlar ${nearestNamaz.name} vaqti kirdi`
                }).show();
                lastNotifiedNamaz = nearestNamaz.name;
            }
        }
    };

    const updateContextMenu = () => {
        const times = fetchedData.times || {};
        const contextMenu = Menu.buildFromTemplate([
            {
                label: `Saharlik - ${times.tong_saharlik || 'N/A'}`,
                type: "normal"
            },
            {
                label: `Quyosh - ${times.quyosh || 'N/A'}`,
                type: "normal"
            },
            {
                label: `Peshin - ${times.peshin || 'N/A'}`,
                type: "normal"
            },
            {
                label: `Asr - ${times.asr || 'N/A'}`,
                type: "normal"
            },
            {
                label: `Shom - ${times.shom_iftor || 'N/A'}`,
                type: "normal"
            },
            {
                label: `Xufton - ${times.hufton || 'N/A'}`,
                type: "normal"
            },
            {type: 'separator'},
            {
                label: "Hudud",
                submenu: Object.entries(regionsWithDistricts).map(([region, districts]) => ({
                    label: region,
                    submenu: districts.map(district => ({
                        label: district,
                        type: "radio",
                        checked: district === currentDistrict,
                        click: () => {
                            currentDistrict = district;
                            currentRegion = region;

                            store.set('selectedRegion', region);
                            store.set('selectedDistrict', district);
                            namazTime();
                        }
                    }))
                }))
            },
            {type: 'separator'},
            {label: 'Chiqish', role: 'quit'}
        ]);
        tray.setContextMenu(contextMenu);
    };

    tray.on('click', () => {
        new Notification({
            title: 'Namaz Reminder',
            body: `Next Namaz times for ${currentDistrict}`
        }).show();
    });

    namazTime();
    setInterval(updateTime, 1000);

    tray.setToolTip('Namoz Vaqti by @JavohirTech');
});

app.dock.hide();
