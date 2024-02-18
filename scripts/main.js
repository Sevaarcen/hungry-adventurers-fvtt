// Constants
const DAY_IN_SECONDS = (60*60*24);

// Hook Foundry initialization and set state for the module
Hooks.on("init", function() {
    console.log("Hungry Adventurers | Initializing variables in game.hungry_adventurers");

    game.hungry_adventurers = {
        enabled: true,
        seconds_since_eating: 0
    }
});

// Hook rendering of the controls to add a toggle button for this module
Hooks.on("getSceneControlButtons", (controls) => {
    controls
        .find((c) => c.name == "notes")
        .tools.push({
            name: "HungryAdventurers",
            title: game.i18n.localize("HAFVTT.ControlToggle"),
            icon: "fas fa-utensils",
            button: true,
            toggle: true,
            active: true,
            visible: game.user.isGM,
            onClick: () => {
                toggle_module_state()
            }
        })
});

// Hook the Simple Calendar module to evaluate if we need to trigger ration consumption when datetime changes
Hooks.on(SimpleCalendar.Hooks.DateTimeChange, (data) => {
    if (!game.hungry_adventurers.enabled) {
        return;
    }
    let before = game.hungry_adventurers.seconds_since_eating;
    game.hungry_adventurers.seconds_since_eating += data.diff;
    console.debug(`Hungry Adventurers | Adding ${data.diff} to ${before}, new total = ${game.hungry_adventurers.seconds_since_eating}`);
    check_ration_consumption();
 });

/**
 * Toggles the current state of this module. Disabling this module
 * will also reset the time since eating to 0. Upon re-enabling,
 * the time will start counting up again.
 *
 * @returns null
 */
function toggle_module_state() {
    if (game.hungry_adventurers.enabled) {
        console.log("Hungry Adventurers | Disabled");
        game.hungry_adventurers.enabled = false;
        game.hungry_adventurers.seconds_since_eating = 0;
    } else {
        console.log("Hungry Adventurers | Enabled");
        game.hungry_adventurers.enabled = true;
    }
}

/**
 * Checks if the seconds since the party last ate exceeds 1 day (based on a "day" according to SC).
 * If the time since last eating is more than 1 day, a ration is automatically consumed.
 * Additionally, a summary of the party's ration consumption is output to the chat.
 */
async function check_ration_consumption() {
    let sc_time_info = SimpleCalendar.api.getCurrentCalendar().time;
    let seconds_in_day = sc_time_info.secondsInMinute * sc_time_info.minutesInHour * sc_time_info.hoursInDay;

    let days_since_eating = game.hungry_adventurers.seconds_since_eating/seconds_in_day;
    console.log(`Hungry Adventurers | Seconds since last ate: ${game.hungry_adventurers.seconds_since_eating}, days: ${days_since_eating} (day=${seconds_in_day} seconds)`);

    if (game.hungry_adventurers.seconds_since_eating < seconds_in_day) {
        console.log("Hungry Adventurers | Not quite hungry yet");
        return;
    }

    let before_eating_info = get_ration_info();

    while (game.hungry_adventurers.seconds_since_eating >= seconds_in_day) {
        await consume_rations();
        game.hungry_adventurers.seconds_since_eating -= seconds_in_day;
    }

    console.log(`Hungry Adventurers | Done consuming the rations, now seconds since last ate is ${game.hungry_adventurers.seconds_since_eating}`);

    let after_eating_info = get_ration_info();
    let ration_changes = []
    let party_members = game.actors.party.members.filter(m => m.type === "character");
    for (const adventurer of party_members) {
        let name = adventurer.name;
        let ration_diff = -1 * (after_eating_info[name] - before_eating_info[name]);
        ration_changes.push({
            name: name,
            change: ration_diff,
            remaining: after_eating_info[name]
        });
    }
    console.log(ration_changes)

    // Make chat card showing a summary of the entire party's ration usage
    const render_context = {
        usage: ration_changes
    };

    const content = await renderTemplate("modules/hungry-adventurers/templates/summary.hbs", render_context);

    const messageData = {
        type: CONST.CHAT_MESSAGE_TYPES["OTHER"],
        content: content,
        speaker: null,
        rolls: null
    }
    ChatMessage.create(messageData, {});
}

/**
 * Gets the information about the party's current rations.
 *
 * @returns {Object} Member name -> day's worth of rations
 */
function get_ration_info() {
    let ration_info = {}
    let party_members = game.actors.party.members.filter(m => m.type === "character");
    for (const adventurer of party_members) {
        let all_ration_items = adventurer.getEmbeddedCollection("items").filter(item => item.name === "Rations");

        if (all_ration_items.length === 0) {
            ration_info[adventurer.name] = 0;
            continue;
        }

        let days_worth = 0;
        for (const ration of all_ration_items) {
            days_worth += ((ration.system.quantity - 1) * ration.system.uses.max) + ration.system.uses.value;
        }
        ration_info[adventurer.name] = days_worth;
    }

    return ration_info;
}

/**
 * For every member of the party, consumes 1 ration from their inventory.
 * If no rations are available, a warning is printed to the chat.
 */
async function consume_rations() {
    console.log("Hungry Adventurers | Party is consuming rations for the day");

    let party_members = game.actors.party.members.filter(m => m.type === "character");
    for (const adventurer of party_members) {
        console.debug(`Hungry Adventurers | Consuming a ration on behalf of ${adventurer.name}`)

        // Find only will get 1 ration from the inventory, but that's all we need here
        let all_ration_items = adventurer.getEmbeddedCollection("items").filter(item => item.name === "Rations");
        if (all_ration_items.length === 0) {
            console.log(`Hungry Adventurers | ${adventurer.name} doesn't have any rations`);
            // Make chat card highlighting the lack of available rations
            const render_context = {
                name: adventurer.name
            };
            const content = await renderTemplate("modules/hungry-adventurers/templates/depleted.hbs", render_context);
            const messageData = {
                type: CONST.CHAT_MESSAGE_TYPES["OTHER"],
                content: content,
                speaker: null,
                rolls: null
            }
            ChatMessage.create(messageData, {});
        } else {
            await all_ration_items[0].consume();
        }
    }
}