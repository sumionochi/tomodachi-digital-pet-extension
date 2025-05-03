module tomodachiaddress::game {
    use std::string::String;
    use sui::dynamic_object_field as dof;
    use sui::table::{Self, Table};

    // === ERROR CODES & PRICING ===
    const EAlreadyRegistered: u64 = 0;
    const ENotRegistered:     u64 = 1;
    const EScoreNotEnough:    u64 = 2;
    const PRICE_ASSET:        u64 = 10;
    const EAlreadyEquipped: u64   = 3;
    const EAssetNotEquipped: u64  = 4;

    // === CAPABILITIES ===
    public struct AdminCap has key, store {
        id: UID,
    }

    public struct UserMintCap has key, store {
        id: UID,
    }

    // === GLOBAL SCOREBOARD ===
    public struct ScoreBoard has key {
        id: UID,
        scores: Table<address, u64>,
    }

    // === MINT TRACKING ===
    public struct MintRecord has key {
        id: UID,
        record: Table<address, bool>,
    }

    // ✅ Called automatically at publish time
    fun init(ctx: &mut TxContext) {
        internal_setup(ctx);
    }

    // ✅ Reusable logic that sets up objects
    fun internal_setup(ctx: &mut TxContext) {
        let admin = AdminCap { id: object::new(ctx) };
        let mintcap = UserMintCap { id: object::new(ctx) };

        let scores = ScoreBoard {
            id: object::new(ctx),
            scores: table::new<address, u64>(ctx),
        };

        let record = MintRecord {
            id: object::new(ctx),
            record: table::new<address, bool>(ctx),
        };

        transfer::transfer(admin, tx_context::sender(ctx));
        transfer::transfer(mintcap, tx_context::sender(ctx));
        transfer::share_object(scores);
        transfer::share_object(record);
    }

    // After—using your constants:
    public entry fun create_user(scores: &mut ScoreBoard, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        let already_exists = table::contains(&scores.scores, sender);
        assert!(!already_exists, EAlreadyRegistered);
        table::add(&mut scores.scores, sender, 0);
    }

    public entry fun check_in(scores: &mut ScoreBoard, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        assert!(table::contains(&scores.scores, sender), ENotRegistered);
        let old = table::remove(&mut scores.scores, sender);
        table::add(&mut scores.scores, sender, old + 2);
    }

    /// Mint an AI‐generated animation or accessory as an on‐chain NFT by spending SCORE.
    /// 
    /// Reuses the “burn‐score, object::new, transfer” pattern from stupet::mint_item.
    public entry fun mint_asset(
        _mint_cap: &mut UserMintCap,
        scores:   &mut ScoreBoard,
        action:   u8,
        frames:   u8,
        url:      String,
        ctx:      &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);

        // 1) Pull current score and ensure enough points
        let current = table::remove(&mut scores.scores, sender);
        assert!(current >= PRICE_ASSET, EScoreNotEnough);

        // 2) Deduct price and write back
        table::add(&mut scores.scores, sender, current - PRICE_ASSET);

        // 3) Mint the Asset object and transfer it to the user
        let asset = Asset {
            id:     object::new(ctx),
            url,
            action,
            frames,
        };
        transfer::transfer(asset, sender);
    }

    /// Mint a new Pet NFT and transfer it to the caller
    public entry fun create_pet(
        _mint_cap: &mut UserMintCap,
        name:      String,
        ctx:       &mut TxContext
    ) {
        // construct the Pet
        let pet = Pet {
            id:   object::new(ctx),
            name,
        };
        // move it directly into the caller’s account
        transfer::transfer(pet, tx_context::sender(ctx));
    }

    public struct Pet has key, store {
        id:   UID,
        name: String,
    }

    public struct Asset has key, store {
        id:     UID,
        url:    String,
        action: u8,
        frames: u8,
    }

    /// Attach an `Asset` NFT to your `Pet`
    public entry fun equip_asset(
        pet:   &mut Pet,
        asset: Asset,
        _ctx:   &mut TxContext
    ) {
        let container = &mut pet.id;
        let key       = object::id(&asset);
        assert!(!dof::exists_(container, key), EAlreadyEquipped);
        dof::add(container, key, asset);
    }

    /// Unequip and transfer the `Asset` back to the caller
    public entry fun unequip_asset(
        pet:      &mut Pet,
        asset_id: ID,
        ctx:      &mut TxContext
    ) {
        let container = &mut pet.id;
        assert!(dof::exists_(container, asset_id), EAssetNotEquipped);
        // 1) Tell the compiler exactly what type we’re pulling out
        let asset: Asset = dof::remove(container, asset_id);
        // 2) Use public_transfer to send it back
        sui::transfer::public_transfer(asset, tx_context::sender(ctx));
    }
}
