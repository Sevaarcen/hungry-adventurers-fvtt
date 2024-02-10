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
                icon: "fas hafvtt-icon",
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


function check_ration_consumption() {
    let days_since_eating = game.hungry_adventurers.seconds_since_eating/DAY_IN_SECONDS;
    console.log(`Hungry Adventurers | Seconds since last ate: ${game.hungry_adventurers.seconds_since_eating}, days: ${days_since_eating}`);
    if (game.hungry_adventurers.seconds_since_eating >= DAY_IN_SECONDS) {
        let before_eating_info = get_ration_info();
        console.log(before_eating_info)
        while (game.hungry_adventurers.seconds_since_eating >= DAY_IN_SECONDS) {
            consume_rations();
            game.hungry_adventurers.seconds_since_eating -= DAY_IN_SECONDS;
        }
        let after_eating_info = get_ration_info();
        console.log(after_eating_info)
        console.log(`Hungry Adventurers | Seconds since last ate: ${game.hungry_adventurers.seconds_since_eating}, days: ${days_since_eating}`);
    } else {
        console.log("Hungry Adventurers | Not quite hungry yet");
    }
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
        await inventory_ration.consume();
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