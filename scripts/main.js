Hooks.on("init", function() {
    console.log("Hungry Adventurers | Initializing variables in game.hungry_adventurers");

    game.hungry_adventurers = {
        seconds_since_eating: 0
    }
});

function check_ration_consumption() {
    let days_since_eating = game.seconds_since_eating/(60*60*24);
    console.log(`Hungry Adventurers | Seconds since last ate: ${game.hungry_adventurers.seconds_since_eating}, days: ${days_since_eating}`);
    if (days_since_eating > 1) {
        let before_eating_info = get_ration_info();
        console.log(before_eating_info)
        while (days_since_eating > 1) {
            consume_rations();
            days_since_eating -= 1;
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

function consume_rations() {
    console.log("Hungry Adventurers | Performing ration consumption")

    let party_members = game.actors.party.members;

    for (const adventurer of party_members) {
        console.log(`Hungry Adventurers | consuming a ration on behalf of ${adventurer.name}`)
        let inventory_ration = adventurer.inventory.find(e => e.name === "Rations");
        inventory_ration.consume();  // no need to await here, it'll happen when it happens
    }
}


Hooks.on(SimpleCalendar.Hooks.DateTimeChange, (data) => {
    console.log("Hungry Adventurers | Caught a datetime change");
    console.log(data);
    console.log(data.diff);
    let before = game.hungry_adventurers.seconds_since_eating;
    game.hungry_adventurers.seconds_since_eating += data.diff;
    console.log(`Hungry Adventurers | Adding ${data.diff} to ${before}, new total = ${game.hungry_adventurers.seconds_since_eating}`)
    check_ration_consumption();
 });