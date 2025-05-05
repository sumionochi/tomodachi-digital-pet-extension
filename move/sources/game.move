module tomodachiaddress::game {
    use std::string::String;
    use sui::dynamic_object_field as dof;
    use sui::table::{Self, Table};
    use sui::event;

    // === ERROR CODES & PRICING ===
    const EAlreadyRegistered: u64 = 0;
    const ENotRegistered:     u64 = 1;
    const EScoreNotEnough:    u64 = 2;
    const PRICE_ASSET:        u64 = 10;
    const EAlreadyEquipped:   u64 = 3;
    const EAssetNotEquipped:  u64 = 4;
    const EAlreadyMinted:     u64 = 5;
    const ENameTaken:         u64 = 6;
    const EAssetAlreadyEquipped: u64 = 7;

    // === CAPABILITIES ===
    public struct AdminCap has key, store {
        id: UID,
    }

    public struct UserMintCap has key, store {
        id: UID,
    }

    // === GLOBAL SCOREBOARD ===
    public struct ScoreBoard has key, store {
        id: UID,
        scores: Table<address, u64>,
    }

    // === MINT TRACKING ===
    public struct MintRecord has key, store {
        id: UID,
        record: Table<address, bool>,
    }

    // === PET NAME TRACKING ===
    public struct PetNames has key, store {
        id: UID,
        names: Table<String, bool>,
    }

    // === ASSET EQUIP TRACKING ===
    public struct EquippedAssets has key, store {
        id: UID,
        assets: Table<ID, bool>,
    }

    // === EVENTS ===
    public struct MintEvent has copy, drop, store {
        user: address,
        asset_id: ID,
    }
    public struct EquipEvent has copy, drop, store {
        user: address,
        pet_id: ID,
        asset_id: ID,
    }
    public struct UnequipEvent has copy, drop, store {
        user: address,
        pet_id: ID,
        asset_id: ID,
    }


    // === INIT ===
    fun init(ctx: &mut TxContext) {
        internal_setup(ctx);
    }

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

        let pet_names = PetNames {
            id: object::new(ctx),
            names: table::new<String, bool>(ctx),
        };

        let equipped_assets = EquippedAssets {
            id: object::new(ctx),
            assets: table::new<ID, bool>(ctx),
        };

        transfer::transfer(admin, tx_context::sender(ctx));
        transfer::transfer(mintcap, tx_context::sender(ctx));
        transfer::share_object(scores);
        transfer::share_object(record);
        transfer::share_object(pet_names);
        transfer::share_object(equipped_assets);
    }

    // === USER REGISTRATION ===
    public entry fun create_user(scores: &mut ScoreBoard, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        let already_exists = table::contains(&scores.scores, sender);
        assert!(!already_exists, EAlreadyRegistered);
        table::add(&mut scores.scores, sender, 0);
    }

    // === DAILY CHECK-IN ===
    public entry fun check_in(scores: &mut ScoreBoard, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        assert!(table::contains(&scores.scores, sender), ENotRegistered);
        let score_ref = table::borrow_mut(&mut scores.scores, sender);
        *score_ref = *score_ref + 2;
    }

    // === MINT ASSET (with MintRecord) ===
    public entry fun mint_asset(
        _mint_cap: &mut UserMintCap,
        scores:   &mut ScoreBoard,
        record:   &mut MintRecord,
        equipped_assets: &mut EquippedAssets,
        action:   u8,
        frames:   u8,
        url:      String,
        ctx:      &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);

        // 1) Prevent double-minting
        let already_minted = table::contains(&record.record, sender);
        assert!(!already_minted, EAlreadyMinted);

        // 2) Pull and check score atomically
        let score_ref = table::borrow_mut(&mut scores.scores, sender);
        assert!(*score_ref >= PRICE_ASSET, EScoreNotEnough);
        *score_ref = *score_ref - PRICE_ASSET;

        // 3) Mark as minted
        table::add(&mut record.record, sender, true);

        // 4) Mint the Asset object and transfer it to the user
        let asset = Asset {
            id:     object::new(ctx),
            url,
            action,
            frames,
        };
        let asset_id = object::id(&asset);

        // 5) Mark asset as not equipped anywhere yet
        table::add(&mut equipped_assets.assets, asset_id, false);

        transfer::transfer(asset, sender);

        // 6) Emit event
        event::emit(MintEvent { user: sender, asset_id });
    }

    // === MINT PET (with unique name) ===
    public entry fun create_pet(
        _mint_cap: &mut UserMintCap,
        pet_names: &mut PetNames,
        name:      String,
        ctx:       &mut TxContext
    ) {
        // 1) Check name uniqueness
        let name_taken = table::contains(&pet_names.names, name);
        assert!(!name_taken, ENameTaken);

        // 2) Mark name as taken
        table::add(&mut pet_names.names, name, true);

        // 3) Construct and transfer Pet
        let pet = Pet {
            id:   object::new(ctx),
            name,
        };
        transfer::transfer(pet, tx_context::sender(ctx));
    }

    // === NFT STRUCTS ===
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

    // === EQUIP ASSET (with global uniqueness) ===
    public entry fun equip_asset(
        pet:   &mut Pet,
        asset: Asset,
        equipped_assets: &mut EquippedAssets,
        _ctx:   &mut TxContext
    ) {
        let container = &mut pet.id;
        let key       = object::id(&asset);

        // 1) Check if asset is already equipped globally
        let is_equipped = table::contains(&equipped_assets.assets, key) && *table::borrow(&equipped_assets.assets, key);
        assert!(!is_equipped, EAssetAlreadyEquipped);

        // 2) Mark asset as equipped
        let asset_equipped_ref = table::borrow_mut(&mut equipped_assets.assets, key);
        *asset_equipped_ref = true;

        // 3) Check if already equipped to this pet
        assert!(!dof::exists_(container, key), EAlreadyEquipped);

        // 4) Attach asset to pet
        dof::add(container, key, asset);

        // 5) Emit event
        event::emit(EquipEvent { user: tx_context::sender(_ctx), pet_id: object::id(pet), asset_id: key });
    }

    // === UNEQUIP ASSET (with global uniqueness) ===
    public entry fun unequip_asset(
        pet:      &mut Pet,
        asset_id: ID,
        equipped_assets: &mut EquippedAssets,
        ctx:      &mut TxContext
    ) {
        let container = &mut pet.id;
        assert!(dof::exists_(container, asset_id), EAssetNotEquipped);

        // 1) Remove asset from pet
        let asset: Asset = dof::remove(container, asset_id);

        // 2) Mark asset as not equipped
        let asset_equipped_ref = table::borrow_mut(&mut equipped_assets.assets, asset_id);
        *asset_equipped_ref = false;

        // 3) Transfer asset back to user
        sui::transfer::public_transfer(asset, tx_context::sender(ctx));

        // 4) Emit event
        event::emit(UnequipEvent { user: tx_context::sender(ctx), pet_id: object::id(pet), asset_id });
    }

    // === ADMIN FUNCTION: Reset user score ===
    public entry fun admin_reset_score(
        admin: &AdminCap,
        scores: &mut ScoreBoard,
        user: address
    ) {
        // Only callable by admin (by possession of AdminCap)
        table::add(&mut scores.scores, user, 0);
    }
}
