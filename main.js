const { app, Tray, Menu, nativeImage } = require('electron/main');

let tray;
let fetchedData = {};

app.on("ready", () => {
    const icon = nativeImage.createFromDataURL('');
    tray = new Tray(icon);

    const namazTime = () => {
        fetch("https://islomapi.uz/api/present/day?region=Toshkent")
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
            { name: 'Tong Saharlik', time: parseTime(times.tong_saharlik) },
            { name: 'Quyosh', time: parseTime(times.quyosh) },
            { name: 'Peshin', time: parseTime(times.peshin) },
            { name: 'Asr', time: parseTime(times.asr) },
            { name: 'Shom Iftor', time: parseTime(times.shom_iftor) },
            { name: 'Hufton', time: parseTime(times.hufton) }
        ];

        const upcomingNamaz = namazTimes.find(namaz => namaz.time > now);
        return upcomingNamaz || namazTimes[0];
    };

    const updateTime = () => {
        const nearestNamaz = getNearestNamazTime();
        if (nearestNamaz) {
            const now = new Date();
            const currentTime = formatTime(now);
            tray.setTitle(`${nearestNamaz.name} - ${formatTime(nearestNamaz.time)}`);
        }
    };

    const updateContextMenu = () => {
        const times = fetchedData.times || {};
        const contextMenu = Menu.buildFromTemplate([
            { label: `Saharlik - ${times.tong_saharlik || 'N/A'}`, type: 'normal' },
            { label: `Quyosh - ${times.quyosh || 'N/A'}`, type: 'normal' },
            { label: `Peshin - ${times.peshin || 'N/A'}`, type: 'normal', checked: true },
            { label: `Asr - ${times.asr || 'N/A'}`, type: 'normal' },
            { label: `Shom Iftor - ${times.shom_iftor || 'N/A'}`, type: 'normal' },
            { label: `Hufton - ${times.hufton || 'N/A'}`, type: 'normal' },
            { type: 'separator' },
            { label: 'Chiqish', role: 'quit' }
        ]);
        tray.setContextMenu(contextMenu);
    };

    namazTime();
    setInterval(updateTime, 1000);

    tray.setToolTip('This is my application.');
});