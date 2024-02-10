const DAY_IN_SECONDS = (60*60*24);

Hooks.on("init", function() {
    console.log("Hungry Adventurers | Initializing variables in game.hungry_adventurers");

    game.hungry_adventurers = {
        enabled: true,
        seconds_since_eating: 0
    }
});

Hooks.on("getSceneControlButtons", (controls) => {
    controls
        .find((c) => c.name == "notes")
        .tools.push(
            {
                name: "HungryAdventurers",
                title: game.i18n.localize("HAFVTT.ControlToggle"),
                icon: "fas bowl-food",
                button: true,
                visible: game.user.isGM,
                onClick: () => {
                    toggle_module_state()
                }
            }
        )
});


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


async function check_ration_consumption() {
    let days_since_eating = game.hungry_adventurers.seconds_since_eating/DAY_IN_SECONDS;
    console.log(`Hungry Adventurers | Seconds since last ate: ${game.hungry_adventurers.seconds_since_eating}, days: ${days_since_eating}`);

    if (game.hungry_adventurers.seconds_since_eating < DAY_IN_SECONDS) {
        console.log("Hungry Adventurers | Not quite hungry yet");
        return;
    }

    let before_eating_info = get_ration_info();

    while (game.hungry_adventurers.seconds_since_eating >= DAY_IN_SECONDS) {
        await consume_rations();
        game.hungry_adventurers.seconds_since_eating -= DAY_IN_SECONDS;
    }

    console.log(`Hungry Adventurers | Seconds since last ate: ${game.hungry_adventurers.seconds_since_eating}, days: ${days_since_eating}`);

    let after_eating_info = get_ration_info();
    let ration_changes = []
    for (const adventurer of game.actors.party.members) {
        let name = adventurer.name;
        let ration_diff = after_eating_info[name] - before_eating_info[name];
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

function get_ration_info() {
    let ration_info = {}
    let party_members = game.actors.party.members;
    for (const adventurer of party_members) {
        let inventory_ration = adventurer.inventory.find(e => e.name === "Rations");
        let days_worth = (
                             (inventory_ration.system.quantity - 1) * inventory_ration.system.uses.max
                         ) + inventory_ration.system.uses.value;
        ration_info[adventurer.name] = days_worth;
    }

    return ration_info;
}

async function consume_rations() {
    console.log("Hungry Adventurers | Performing ration consumption")

    let party_members = game.actors.party.members;

    for (const adventurer of party_members) {
        console.log(`Hungry Adventurers | consuming a ration on behalf of ${adventurer.name}`)
        let inventory_ration = adventurer.inventory.find(e => e.name === "Rations");
        if(inventory_ration === undefined) {
            // Make chat card showing a summary of the entire party's ration usage
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
            await inventory_ration.consume();
        }
    }
}


Hooks.on(SimpleCalendar.Hooks.DateTimeChange, (data) => {
    console.log("Hungry Adventurers | Caught a datetime change");
    if (!game.hungry_adventurers.enabled) {
        console.log("Hungry Adventurers | Skipping action, is disabled");
        return;
    }
    console.log(data);
    console.log(data.diff);
    let before = game.hungry_adventurers.seconds_since_eating;
    game.hungry_adventurers.seconds_since_eating += data.diff;
    console.log(`Hungry Adventurers | Adding ${data.diff} to ${before}, new total = ${game.hungry_adventurers.seconds_since_eating}`);
    check_ration_consumption();
 });