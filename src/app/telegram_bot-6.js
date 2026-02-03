const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const cron = require('node-cron');
const moment = require('moment');

const BOT_TOKEN = '8016156710:AAEOeblyNRnFPhG5grMFH8NKKCaqHOEsU78';
// const BOT_TOKEN = '8120689534:AAGgRKmPlWZ0iptHA2gIeyACy6L1rrhdTNo';
const SUBSCRIBERS_FILE = 'schedule_subscribers.json';
const ALL_SUBSCRIBERS_FILE = 'all_subscribers.json';
const WEEK_IDENTIFIER_FILE = 'week_identifier.json';
const ADMIN_CHAT_ID = 2015861143;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log("Bot started...");

function loadAllSubscribers() {
    if (!fs.existsSync(ALL_SUBSCRIBERS_FILE)) {
        return [];
    }
    try {
        return JSON.parse(fs.readFileSync(ALL_SUBSCRIBERS_FILE, 'utf-8'));
    } catch (error) {
        return [];
    }
}

function saveAllSubscribers(subscribers) {
    fs.writeFileSync(ALL_SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 4), 'utf-8');
}

function addSubscriberToAll(chatId, name, username) {
    let subscribers = loadAllSubscribers();
    if (!subscribers.some(sub => sub.chatId === chatId)) {
        subscribers.push({ chatId, name, username });
        console.log(`Save to ${ALL_SUBSCRIBERS_FILE}: ${chatId} ${name} ${username}`)
        saveAllSubscribers(subscribers);
    }
}

function saveSubscribers(subscribers) {
    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 4), 'utf-8');
}

function loadSubscribers() {
    if (!fs.existsSync(SUBSCRIBERS_FILE)) {
        return { currentWeek: [], nextWeek: [] };
    }
    try {
        return JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf-8'));
    } catch (error) {
        return { currentWeek: [], nextWeek: [] };
    }
}

function addSubscriber(chatId, name, username) {
    const subscribers = loadSubscribers();
    const now = moment();

    const newSubscriber = { chatId, name, username, registrationTime: now.toISOString() };

    if (shouldStartNextWeekSubscribers()) {
      if (!subscribers.nextWeek.some(sub => sub.chatId === chatId)) {
        subscribers.nextWeek.push(newSubscriber);
        console.log(`Save to ${SUBSCRIBERS_FILE} on NEXT WEEK: ${newSubscriber.chatId} ${newSubscriber.name} ${newSubscriber.username}`);
        bot.sendMessage(ADMIN_CHAT_ID, `На следующею неделю записался пользователь: ${newSubscriber.chatId} ${newSubscriber.name} ${newSubscriber.username}.`);
      }
    } else {
      if (!subscribers.currentWeek.some(sub => sub.chatId === chatId)) {
        subscribers.currentWeek.push(newSubscriber);
        console.log(`Save to ${SUBSCRIBERS_FILE} on CURRENT WEEK: ${newSubscriber.chatId} ${newSubscriber.name} ${newSubscriber.username}`)
        bot.sendMessage(ADMIN_CHAT_ID, `На эту неделю записался пользователь: ${newSubscriber.chatId} ${newSubscriber.name} ${newSubscriber.username}.`);
      }
    }
    saveSubscribers(subscribers);
}

function shouldStartNextWeekSubscribers() {
  const now = moment();
  const meeting = moment().isoWeekday(5).hour(18).minute(0).second(0);
  const saturdayLastSent = moment().isoWeekday(6).hour(10).minute(0).second(0);
  return (now.isSameOrAfter(meeting) && now.isSameOrBefore(saturdayLastSent));
}

function moveNextWeekToCurrent() {
  const subscribers = loadSubscribers();
  subscribers.currentWeek.length = 0;
  subscribers.currentWeek.push(...subscribers.nextWeek);
  subscribers.nextWeek = [];
  saveSubscribers(subscribers);
}

bot.onText(/\/start/, async (msg) => {
    const name = msg.from.first_name;
    const chatId = msg.chat.id;
    const userName = msg.from.username || "";

    addSubscriber(chatId, name, userName);
    addSubscriberToAll(chatId, name, userName);
    await bot.sendPhoto(chatId, 't.jpg', {
        caption: `${name}, спасибо, что приняли решение прийти на занятие.\n\n` +
            "Этот чат-бот помощник пришлёт Вам напоминание о занятии за день и за час до встречи и ссылку на мероприятие.\n\n" +
            "Урок состоится:\n" +
            "в пятницу, время:\n" +
            "<a href='https://t.me/vedas_yoga_meditation'>19.00</a> по Москве (Киев, Минск, Бухарест, Багдад, Стамбул, Афины)\n" +
            "<a href='https://t.me/vedas_yoga_meditation'>18.00</a> по Варшаве (Берлин, Париж, Мадрид, Рим)\n" +
            "<a href='https://t.me/vedas_yoga_meditation'>17.00</a> по Лондону (Дублин, Касабланка)\n" +
            "<a href='https://t.me/vedas_yoga_meditation'>16.00</a> по Лиссабону (Рейкьявик, Дакар, Биэнос-Айрес)\n" +
            "<a href='https://t.me/vedas_yoga_meditation'>15.00</a> по Праге\n" +
            "<a href='https://t.me/vedas_yoga_meditation'>14.00</a> по Нью-Йорку (Торонто, Ямайка, Гаити, Багамы)\n" +
            "<a href='https://t.me/vedas_yoga_meditation'>13.00</a> по Чикаго (Мехико, Сан-Хосе)\n" +
            "<a href='https://t.me/vedas_yoga_meditation'>12.00</a> по Лос-Анджелес (Ванкувер)\n" +
            "<a href='https://t.me/vedas_yoga_meditation'>11.00</a> по Аляске\n" +
            "<a href='https://t.me/vedas_yoga_meditation'>10.00</a> по Анкоридж (Алеутские острова)\n" +
            "<a href='https://t.me/vedas_yoga_meditation'>9.00</a> по Гонолулу (Таити)\n" +
            "Спасибо🙂. Ждём Вас на занятии. 🙏🏼❤️😊\n\n" +
            "Все занятия по изучению Вед БЕСПЛАТНЫЕ!",
        parse_mode: 'HTML'
    });
});

bot.onText(/\/haribol/, async (msg) => {
    const chatId = msg.chat.id;
    if(chatId === ADMIN_CHAT_ID){
        bot.sendMessage(ADMIN_CHAT_ID, "Gauranga");
    }
});


async function sendRemindersToGroup(subscribers, message, buttons = null) {
    console.log("Sending reminders to:", subscribers.length, "subscribers");
    for (const subscriber of subscribers) {
        try {
            console.log(`Sending reminder to ${subscriber.chatId} ${subscriber.name} ${subscriber.username}`);
            const options = {
                caption: message,
                parse_mode: 'HTML'
            };
            if (buttons) {
                options.reply_markup = { inline_keyboard: [buttons] };
            }
            await bot.sendPhoto(subscriber.chatId, 't.jpg', options);
        } catch (error) {
            console.error(`Failed to send reminder to ${subscriber.chatId} ${subscriber.name} ${subscriber.username}: ${error}`);
        }
    }
}

bot.onText(/\/send_thursday/, async (msg) => {
    const chatId = msg.chat.id
    if(chatId === ADMIN_CHAT_ID){
        thursdayReminder()
    }
})

function thursdayReminder() {
    console.log("Thursday reminder triggered!");
    const { currentWeek } = loadSubscribers();
    sendRemindersToGroup(currentWeek, "Напоминаем 😊, что завтра (в пятницу) состоится первое занятие по изучению Вед в:\n" +
        "<a href='https://t.me/vedas_yoga_meditation'>19.00</a> по Москве (Киев, Минск, Бухарест, Багдад, Стамбул, Афины)\n" +
        "<a href='https://t.me/vedas_yoga_meditation'>18.00</a> по Варшаве (Берлин, Париж, Мадрид, Рим)\n" +
        "<a href='https://t.me/vedas_yoga_meditation'>17.00</a> по Лондону (Дублин, Касабланка)\n" +
        "<a href='https://t.me/vedas_yoga_meditation'>16.00</a> по Лиссабону (Рейкьявик, Дакар, Биэнос-Айрес)\n" +
        "<a href='https://t.me/vedas_yoga_meditation'>15.00</a> по Праге\n" +
        "<a href='https://t.me/vedas_yoga_meditation'>14.00</a> по Нью-Йорку (Торонто, Ямайка, Гаити, Багамы)\n" +
        "<a href='https://t.me/vedas_yoga_meditation'>13.00</a> по Чикаго (Мехико, Сан-Хосе)\n" +
        "<a href='https://t.me/vedas_yoga_meditation'>12.00</a> по Лос-Анджелес (Ванкувер)\n" +
        "<a href='https://t.me/vedas_yoga_meditation'>11.00</a> по Аляске\n" +
        "<a href='https://t.me/vedas_yoga_meditation'>10.00</a> по Анкоридж (Алеутские острова)\n" +
        "<a href='https://t.me/vedas_yoga_meditation'>9.00</a> по Гонолулу (Таити)\n" +
        "Ждём Вас на занятии. 🙏🏼❤️😊\n\n" +
        "Все занятия по изучению Вед БЕСПЛАТНЫЕ!")
}

bot.onText(/\/send_friday/, async (msg) => {
    const chatId = msg.chat.id
    if(chatId === ADMIN_CHAT_ID){
        fridayReminder()
    }
})

function fridayReminder() {
    console.log("Friday reminder triggered!");
    const { currentWeek } = loadSubscribers();
    sendRemindersToGroup(currentWeek, "Уже через час состоится первое занятие по изучению Вед. Переходите по ссылке:\n\n" +
        "Ждём Вас и до встречи 😊🙏🏼", [
        { text: "💚 Ссылка на занятие", url: "https://telemost.yandex.ru/j/62043766556281" }
    ]);
}

bot.onText(/\/send_saturday/, async (msg) => {
    const chatId = msg.chat.id
    if(chatId === ADMIN_CHAT_ID){
        saturdayInvitation()
    }
})

function saturdayInvitation() {
    console.log("Saturday invitation triggered!");
    const { currentWeek } = loadSubscribers();
    sendRemindersToGroup(currentWeek, "Приглашаем Вас присоединиться к нашей группе в Телеграмме, где Вы сможете больше знакомиться с Ведами, Бхакти Йогой и практиками Медитации 😊❤️🙏🏼.\n\n" +
        "Если возникли какие-то вопросы или проблемы с регистрацией, Вы можете написать в Телеграмм @Murari_pion либо на email murari.mag@gmail.com.", [
        { text: "💚 Ссылка на канал в ТГ", url: "https://t.me/vedas_yoga_meditation" }
    ]);
    sendRemindersToGroup(currentWeek, "Если Вы не смогли прийти на вчерашнее занятие, то вы можете перезапустить чат-бота и зарегистрироваться ещё раз.\n\n", [
        { text: "💚 Ссылка на повторную запись на первое занятие", callback_data: 'repeat_registration' }
    ]);
    moveNextWeekToCurrent();
}

bot.on('callback_query', (query) => {
    if (query.data === 'repeat_registration') {
        const chatId = query.message.chat.id;
        const name = query.from.first_name;
        const username = query.from.username || "";
        let subscribers = loadSubscribers();
        let existingSubscriber = subscribers.currentWeek.find(sub => sub.chatId === chatId);

        if (existingSubscriber) {
            existingSubscriber.registrationTime = new Date().toISOString();
            console.log(`Repeat Registration of Existing Subscriber: ${chatId} ${name} ${username}`)
        } else {
            subscribers.currentWeek.push({
                chatId,
                name,
                username,
                registrationTime: new Date().toISOString()
            });
            console.log(`Repeat Registration of Subscriber: ${chatId} ${name} ${username}`)
        }
        saveSubscribers(subscribers);
        bot.sendMessage(chatId, "Вы успешно зарегистрировались повторно. Напоминания будут отправлены в нужное время.");
        bot.sendMessage(ADMIN_CHAT_ID, `На эту неделю записался пользователь: ${chatId} ${name} ${username}.`);
    }
});

cron.schedule('00 13 * * 4', thursdayReminder, { timezone: "Europe/Moscow" }); // Thursday 13:00 PM
cron.schedule('00 18 * * 5', fridayReminder, { timezone: "Europe/Moscow" });    // Friday 18:00 PM
cron.schedule('00 10 * * 6', saturdayInvitation, { timezone: "Europe/Moscow" });// Saturday 10:00 AM

console.log("Scheduler is set up.");

process.on('SIGINT', () => {
    bot.sendMessage(ADMIN_CHAT_ID, "Bot is shutting down...");
    console.log("Bot is shutting down...");
    process.exit();
});