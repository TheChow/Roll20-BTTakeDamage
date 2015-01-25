var BTTakeDamage = BTTakeDamage || (function() {

    function hitMech(loc, dam, gameInfo) {
        loc = loc.toLowerCase();
        gameInfo.mechName = getAttrByName(gameInfo.characterId, "mech_name");
        //log ("[BTTakeDamage] loc: " + loc + " dam: " + dam + " gameInfo: " + JSON.stringify(gameInfo));
        hitArmor(loc, dam, gameInfo);
        /*
        var locarmor = loc + "_armor";
        var locAttr = findObjs({
            _characterid: gameInfo.characterId,
            _type: "attribute",
            name: locarmor,
        })[0];
        */
    }

    function hitInternal(loc, dam, gameInfo) {
        if (loc.length === 3) 
            loc = loc.substr(0,2);

        var locAttr = findObjs({
            _characterid: gameInfo.characterId,
            _type: "attribute",
            name: _attributeMap[loc] + "_internalstructure",
        })[0];
        
        var currInternal = locAttr.get("current");
        if (currInternal === 0) {
            if (loc === 'ct' || loc === 'hd') {
                sendChat(gameInfo.who, gameInfo.mechName + " has already been destroyed.");
                return;
            }
            var cascadeLoc = _cascadeMap[loc];
            sendChat(gameInfo.who, gameInfo.mechName + " has nothing at " + loc.toUpperCase() + ", damage cascades to " + 
                cascadeLoc.toUpperCase() + ".");
            return hitArmor(cascadeLoc, dam, gameInfo);
        } 
        
        if (parseInt(dam) <= parseInt(currInternal)) {
            locAttr.set("current", locAttr.get("current") - dam);
            sendChat(gameInfo.who, gameInfo.mechName + " internal structure at " + loc.toUpperCase() + " took " + 
                dam + " damage.");
        }        
        else {
            cascadeLoc = _cascadeMap[loc];
            var newDam = dam - locAttr.get("current", 0);
            locAttr.set("current", 0);
            if (loc === 'ct' || loc === 'hd'){
                sendChat(gameInfo.who, gameInfo.mechName + " is destroyed!");
                return;
            }
            
            sendChat(gameInfo.who, gameInfo.mechName + "'s " + loc.toUpperCase() + " was destroyed.  Damage cascades to " + 
                cascadeLoc.toUpperCase() + ".");
                return hitArmor(cascadeLoc, newDam, gameInfo);
        }
    }
    
    function hitArmor(loc, dam, gameInfo) {        
        var locAttr = findObjs({
            _characterid: gameInfo.characterId,
            _type: "attribute",
            name: _attributeMap[loc] + "_armor",
        })[0];        

        if (locAttr === null || typeof locAttr === "undefined") {
            log("[BTTakeDamage.hitArmor] loc: " + loc + " dam: " + dam +" gameInfo.characaterId: " + gameInfo.characaterId);
            return;
        }
        var currArmor = locAttr.get("current");    
        if (currArmor === 0) {
            return hitInternal(loc, dam, gameInfo);
        } 
        
        /*
        log("[BTTakeDamage.HitArmor] loc: " + loc + " dam: " + dam + 
            " currArmor: " + currArmor + 
            " gameInfo.characterId: " + gameInfo.characterId + 
            " this._attributeMap[loc]: " + this._attributeMap[loc]);
        */
        if (parseInt(dam) > parseInt(currArmor)) {
            locAttr.set("current", 0);
            dam -= currArmor;
            sendChat(gameInfo.who, gameInfo.mechName + " armor at " + loc.toUpperCase() + " is gone.  Damage goes internal.");
            return hitInternal(loc, dam, gameInfo);
        }                 
        
        locAttr.set("current", currArmor - dam);        
        sendChat(gameInfo.who, gameInfo.mechName + " was hit in the " + loc.toUpperCase() + " for " + dam + " damage.");
    }
    
    function criticalHitMech(characterId, loc) {
        loc = loc.toLowerCase();
        var upperOrLower, hit, component;
        var baseComp = _attributeMap[loc];
        var s = 0;
        
        var locarmor = loc + "_armor";
        var locAttr = findObjs({
            _characterid: characterId,
            _type: "attribute",
            name: locarmor,
        })[0];
        
        do {
            log("[BTTakeDamage] attempt: " + s);
            upperOrLower = randomInteger(6);
            hit = randomInteger(6);
            var componentName = baseComp + "_" + (upperOrLower < 4 ? "a" : "b") + hit.toString();
            log("BTTakeDamage.criticalHitMech: " + componentName);
            //criticalhit_lefttorso_b4 = 1 when hit, 0 or undefined when not-hit
            //lefttorso_b4            
        } while (component === null || s++ < 10) 
    }
    
    // returns number of critical hits based upon hit location.  -1 if the limb is blown off.
    function findCriticalHits(loc) {
        var roll = randomInteger(6) + randomInteger(6);
        switch (roll) {
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
                return 0;
            case 8:
            case 9:
                return 1;
            case 10:
            case 11:
                return 2;
            case 12:
                if (loc === null || loc !== 'lt' || loc !== 'rt' || loc !== 'ct')
                    return 3;
                return -1;
        }
    }
    
    // used for mapping the root of the attirbute, doesn't include indicator such as "armor" or "internalstructure"
    _attributeMap = {
        "hd": "head",
        "lt": "lefttorso",
        "la": "leftarm",
        "ll": "leftleg",
        "ltr": "lefttorso_rear",
        "rt": "righttorso",
        "ra": "rightarm",
        "rl": "rightleg",
        "rtr": "righttorso_rear",
        "ct": "centertorso",
        "ctr": "centertorso_rear",
    };

    _cascadeMap = {
        "ll" : "lt",
        "la" : "lt",
        "lt" : "ct",
        "rl" : "rt",
        "ra" : "rt",
        "rt" : "ct",        
    };
    
    return {
		HitMech : hitMech,
        CriticalHitMech : criticalHitMech
	};
})();




on("chat:message", function (msg) {
    if (msg.type == "api" && msg.content.indexOf("!td") !== -1) {
        var params = msg.content.split(" ");
        if (params.length !== 3) return;
        var loc = params[1].toLowerCase();
        var dam = params[2].toLowerCase();
        
        var currentChars = findObjs({
            _type: "character",
            controlledby : msg.playerid,
        });        
        
        if (currentChars.length !== 1) {
            sendChat("cannot find character");
            return;
        }        
        var character = currentChars[0];
        
        log("[BTTakeDamage] playerid: " + msg.playerid + " characterId: "  + character.id);
        BTTakeDamage.HitMech(loc, dam, { characterId: character.id, who: msg.who });
    }
    
    if (msg.type == "api" && msg.content.indexOf("!ch") !== -1) {        
        BTTakeDamage.CriticalHitMech("-Jcr6ZjLEX_hLTmW168C", "LL");
    }
});