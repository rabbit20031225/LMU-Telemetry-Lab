import json
import duckdb
import os

SVM_MAPPING = {
    "GENERAL": [
        ("Notes", '""'),
        ("Symmetric", '1'),
        ("CGHeightSetting", '0//Non-adjustable'),
        ("CGRightSetting", '0//Non-adjustable'),
        ("CGRearSetting", '0//Non-adjustable'),
        ("WedgeSetting", 'VM_WEIGHT_WEDGE'),
        ("FuelSetting", 'VM_FUEL_LEVEL'),
        ("FuelCapacitySetting", 'VM_FUEL_CAPACITY'),
        ("VirtualEnergySetting", 'VM_VIRTUAL_ENERGY'),
        ("NumPitstopsSetting", 'VM_NUM_PITSTOPS'),
        ("Pitstop1Setting", 'VM_PITSTOP_1'),
        ("Pitstop2Setting", 'VM_PITSTOP_2'),
        ("Pitstop3Setting", 'VM_PITSTOP_3'),
    ],
    "LEFTFENDER": [
        ("FenderFlareSetting", 'VM_LEFT_FENDER_FLARE'),
    ],
    "RIGHTFENDER": [
        ("FenderFlareSetting", 'VM_RIGHT_FENDER_FLARE'),
    ],
    "FRONTWING": [
        ("FWSetting", 'VM_FRONT_WING'),
    ],
    "REARWING": [
        ("RWSetting", 'VM_REAR_WING'),
    ],
    "BODYAERO": [
        ("WaterRadiatorSetting", 'VM_WATER_RADIATOR'),
        ("OilRadiatorSetting", 'VM_OIL_RADIATOR'),
        ("BrakeDuctSetting", 'VM_BRAKE_DUCTS'),
        ("BrakeDuctRearSetting", 'VM_BRAKE_DUCTS_REAR'),
    ],
    "SUSPENSION": [
        ("FrontWheelTrackSetting", 'VM_FRONT_WHEEL_TRACK'),
        ("RearWheelTrackSetting", 'VM_REAR_WHEEL_TRACK'),
        ("FrontAntiSwaySetting", 'VM_FRONT_ANTISWAY'),
        ("RearAntiSwaySetting", 'VM_REAR_ANTISWAY'),
        ("FrontToeInSetting", 'VM_FRONT_TOEIN'),
        ("FrontToeOffsetSetting", 'VM_FRONT_TOEOFFSET'),
        ("RearToeInSetting", 'VM_REAR_TOEIN'),
        ("RearToeOffsetSetting", 'VM_REAR_TOEOFFSET'),
        ("LeftCasterSetting", 'VM_LEFT_CASTER'),
        ("RightCasterSetting", 'VM_RIGHT_CASTER'),
        ("LeftTrackBarSetting", 'VM_LEFT_TRACK_BAR'),
        ("RightTrackBarSetting", 'VM_RIGHT_TRACK_BAR'),
        ("Front3rdPackerSetting", 'VM_FRONT_3RD_PACKERS'),
        ("Front3rdSpringSetting", 'VM_FRONT_3RD_SPRING'),
        ("Front3rdTenderSpringSetting", 'VM_FRONT_3RD_TENDERSPRING'),
        ("Front3rdTenderTravelSetting", 'VM_FRONT_3RD_TENDERSPRINGTRAVEL'),
        ("Front3rdSlowBumpSetting", 'VM_FRONT_3RD_SLOWBUMP'),
        ("Front3rdFastBumpSetting", 'VM_FRONT_3RD_FASTBUMP'),
        ("Front3rdSlowReboundSetting", 'VM_FRONT_3RD_SLOWREBOUND'),
        ("Front3rdFastReboundSetting", 'VM_FRONT_3RD_FASTREBOUND'),
        ("Rear3rdPackerSetting", 'VM_REAR_3RD_PACKERS'),
        ("Rear3rdSpringSetting", 'VM_REAR_3RD_SPRING'),
        ("Rear3rdTenderSpringSetting", 'VM_REAR_3RD_TENDERSPRING'),
        ("Rear3rdTenderTravelSetting", 'VM_REAR_3RD_TENDERSPRINGTRAVEL'),
        ("Rear3rdSlowBumpSetting", 'VM_REAR_3RD_SLOWBUMP'),
        ("Rear3rdFastBumpSetting", 'VM_REAR_3RD_FASTBUMP'),
        ("Rear3rdSlowReboundSetting", 'VM_REAR_3RD_SLOWREBOUND'),
        ("Rear3rdFastReboundSetting", 'VM_REAR_3RD_FASTREBOUND'),
        ("ChassisAdj00Setting", 'VM_CHASSIS_ADJ_00'),
        ("ChassisAdj01Setting", 'VM_CHASSIS_ADJ_01'),
        ("ChassisAdj02Setting", 'VM_CHASSIS_ADJ_02'),
        ("ChassisAdj03Setting", 'VM_CHASSIS_ADJ_03'),
        ("ChassisAdj04Setting", 'VM_CHASSIS_ADJ_04'),
        ("ChassisAdj05Setting", 'VM_CHASSIS_ADJ_05'),
        ("ChassisAdj06Setting", 'VM_CHASSIS_ADJ_06'),
        ("ChassisAdj07Setting", 'VM_CHASSIS_ADJ_07'),
        ("ChassisAdj08Setting", 'VM_CHASSIS_ADJ_08'),
        ("ChassisAdj09Setting", 'VM_CHASSIS_ADJ_09'),
        ("ChassisAdj10Setting", 'VM_CHASSIS_ADJ_10'),
        ("ChassisAdj11Setting", 'VM_CHASSIS_ADJ_11'),
    ],
    "CONTROLS": [
        ("SteerLockSetting", 'VM_STEER_LOCK'),
        ("RearBrakeSetting", 'VM_BRAKE_BALANCE'),
        ("BrakeMigrationSetting", 'VM_BRAKE_MIGRATION'),
        ("BrakePressureSetting", 'VM_BRAKE_PRESSURE'),
        ("HandfrontbrakePressSetting", 'VM_HANDFRONTBRAKE_PRESSURE'),
        ("HandbrakePressSetting", 'VM_HANDBRAKE_PRESSURE'),
        ("TCSetting", 'VM_TRACTION_CONTROL'),
        ("ABSSetting", 'VM_ANTILOCK_BRAKES'),
        ("TractionControlMapSetting", 'VM_TRACTIONCONTROLMAP'),
        ("TCPowerCutMapSetting", 'VM_TRACTIONCONTROLPOWERCUTMAP'),
        ("TCSlipAngleMapSetting", 'VM_TRACTIONCONTROLSLIPANGLEMAP'),
        ("AntilockBrakeSystemMapSetting", 'VM_ANTILOCKBRAKESYSTEMMAP'),
    ],
    "ENGINE": [
        ("RevLimitSetting", 'VM_REV_LIMITER'),
        ("EngineBoostSetting", 'VM_ENGINE_BOOST'),
        ("RegenerationMapSetting", 'VM_REGEN_LEVEL'),
        ("ElectricMotorMapSetting", 'VM_ELECTRIC_MOTOR_MAP'),
        ("EngineMixtureSetting", 'VM_ENGINE_MIXTURE'),
        ("EngineBrakingMapSetting", 'VM_ENGINE_BRAKEMAP'),
    ],
    "DRIVELINE": [
        ("FinalDriveSetting", 'VM_GEAR_FINAL'),
        ("ReverseSetting", 'VM_GEAR_REVERSE'),
        ("Gear1Setting", 'VM_GEAR_1'),
        ("Gear2Setting", 'VM_GEAR_2'),
        ("Gear3Setting", 'VM_GEAR_3'),
        ("Gear4Setting", 'VM_GEAR_4'),
        ("Gear5Setting", 'VM_GEAR_5'),
        ("Gear6Setting", 'VM_GEAR_6'),
        ("RatioSetSetting", 'VM_RATIO_SET'),
        ("DiffPumpSetting", 'VM_DIFF_PUMP'),
        ("DiffPowerSetting", 'VM_DIFF_POWER'),
        ("DiffCoastSetting", 'VM_DIFF_COAST'),
        ("DiffPreloadSetting", 'VM_DIFF_PRELOAD'),
        ("FrontDiffPumpSetting", 'VM_FRONT_DIFF_PUMP'),
        ("FrontDiffPowerSetting", 'VM_FRONT_DIFF_POWER'),
        ("FrontDiffCoastSetting", 'VM_FRONT_DIFF_COAST'),
        ("FrontDiffPreloadSetting", 'VM_FRONT_DIFF_PRELOAD'),
        ("RearSplitSetting", 'VM_TORQUE_SPLIT'),
        ("GearAutoUpShiftSetting", 'VM_GEAR_AUTOUPSHIFT'),
        ("GearAutoDownShiftSetting", 'VM_GEAR_AUTODOWNSHIFT'),
    ],
    "FRONTLEFT": [
        ("CamberSetting", 'WM_CAMBER-W_FL'),
        ("PressureSetting", 'WM_PRESSURE-W_FL'),
        ("PackerSetting", 'WM_PACKERS-W_FL'),
        ("SpringSetting", 'WM_SPRING-W_FL'),
        ("TenderSpringSetting", 'WM_TENDERSPRING-W_FL'),
        ("TenderTravelSetting", 'WM_TENDERSPRINGTRAVEL-W_FL'),
        ("SpringRubberSetting", 'WM_SRUBBER-W_FL'),
        ("RideHeightSetting", 'WM_RIDEHEIGHT-W_FL'),
        ("SlowBumpSetting", 'WM_SLOWBUMP-W_FL'),
        ("FastBumpSetting", 'WM_FASTBUMP-W_FL'),
        ("SlowReboundSetting", 'WM_SLOWREBOUND-W_FL'),
        ("FastReboundSetting", 'WM_FASTREBOUND-W_FL'),
        ("BrakeDiscSetting", 'WM_BRAKEDISC-W_FL'),
        ("BrakePadSetting", 'WM_BRAKEPAD-W_FL'),
        ("CompoundSetting", 'VM_FRONT_TIRE_COMPOUND'),
    ],
    "FRONTRIGHT": [
        ("CamberSetting", 'WM_CAMBER-W_FR'),
        ("PressureSetting", 'WM_PRESSURE-W_FR'),
        ("PackerSetting", 'WM_PACKERS-W_FR'),
        ("SpringSetting", 'WM_SPRING-W_FR'),
        ("TenderSpringSetting", 'WM_TENDERSPRING-W_FR'),
        ("TenderTravelSetting", 'WM_TENDERSPRINGTRAVEL-W_FR'),
        ("SpringRubberSetting", 'WM_SRUBBER-W_FR'),
        ("RideHeightSetting", 'WM_RIDEHEIGHT-W_FR'),
        ("SlowBumpSetting", 'WM_SLOWBUMP-W_FR'),
        ("FastBumpSetting", 'WM_FASTBUMP-W_FR'),
        ("SlowReboundSetting", 'WM_SLOWREBOUND-W_FR'),
        ("FastReboundSetting", 'WM_FASTREBOUND-W_FR'),
        ("BrakeDiscSetting", 'WM_BRAKEDISC-W_FR'),
        ("BrakePadSetting", 'WM_BRAKEPAD-W_FR'),
        ("CompoundSetting", 'VM_FRONT_TIRE_COMPOUND'),
    ],
    "REARLEFT": [
        ("CamberSetting", 'WM_CAMBER-W_RL'),
        ("PressureSetting", 'WM_PRESSURE-W_RL'),
        ("PackerSetting", 'WM_PACKERS-W_RL'),
        ("SpringSetting", 'WM_SPRING-W_RL'),
        ("TenderSpringSetting", 'WM_TENDERSPRING-W_RL'),
        ("TenderTravelSetting", 'WM_TENDERSPRINGTRAVEL-W_RL'),
        ("SpringRubberSetting", 'WM_SRUBBER-W_RL'),
        ("RideHeightSetting", 'WM_RIDEHEIGHT-W_RL'),
        ("SlowBumpSetting", 'WM_SLOWBUMP-W_RL'),
        ("FastBumpSetting", 'WM_FASTBUMP-W_RL'),
        ("SlowReboundSetting", 'WM_SLOWREBOUND-W_RL'),
        ("FastReboundSetting", 'WM_FASTREBOUND-W_RL'),
        ("BrakeDiscSetting", 'WM_BRAKEDISC-W_RL'),
        ("BrakePadSetting", 'WM_BRAKEPAD-W_RL'),
        ("CompoundSetting", 'VM_REAR_TIRE_COMPOUND'),
    ],
    "REARRIGHT": [
        ("CamberSetting", 'WM_CAMBER-W_RR'),
        ("PressureSetting", 'WM_PRESSURE-W_RR'),
        ("PackerSetting", 'WM_PACKERS-W_RR'),
        ("SpringSetting", 'WM_SPRING-W_RR'),
        ("TenderSpringSetting", 'WM_TENDERSPRING-W_RR'),
        ("TenderTravelSetting", 'WM_TENDERSPRINGTRAVEL-W_RR'),
        ("SpringRubberSetting", 'WM_SRUBBER-W_RR'),
        ("RideHeightSetting", 'WM_RIDEHEIGHT-W_RR'),
        ("SlowBumpSetting", 'WM_SLOWBUMP-W_RR'),
        ("FastBumpSetting", 'WM_FASTBUMP-W_RR'),
        ("SlowReboundSetting", 'WM_SLOWREBOUND-W_RR'),
        ("FastReboundSetting", 'WM_FASTREBOUND-W_RR'),
        ("BrakeDiscSetting", 'WM_BRAKEDISC-W_RR'),
        ("BrakePadSetting", 'WM_BRAKEPAD-W_RR'),
        ("CompoundSetting", 'VM_REAR_TIRE_COMPOUND'),
    ],
    "BASIC": [
        ("Downforce", '0.500000'),
        ("Balance", '0.500000'),
        ("Ride", '0.500000'),
        ("Gearing", '0.500000'),
        ("Custom", '1')
    ]
}

def generate_svm_from_duckdb(db_path: str) -> str:
    """Generates the content of an .svm file from a DuckDB session database."""
    if not os.path.exists(db_path):
        raise ValueError("Database file not found.")

    with duckdb.connect(db_path, read_only=True) as con:
        # Get metadata needed for header
        meta_rows = con.execute("SELECT key, value FROM metadata WHERE key IN ('CarName', 'CarClass')").fetchall()
        meta_dict = {k: v for k, v in meta_rows}
        
        car_class = meta_dict.get('CarClass', 'Unknown Class')
        
        # Get CarSetup JSON
        row = con.execute("SELECT value FROM metadata WHERE key = 'CarSetup'").fetchone()
        if not row:
            raise ValueError("CarSetup metadata not found.")
            
        setup_data = json.loads(row[0])

    lines = []
    # Header
    lines.append(f'VehicleClassSetting="{car_class}"')
    lines.append('UpgradeSetting=(0,0,0,0)')
    lines.append('// Generated by LMU Telemetry Lab')
    lines.append('//Note: settings commented out if using the default')
    lines.append('')
    
    for section, mappings in SVM_MAPPING.items():
        lines.append(f"[{section}]")
        for svm_key, db_key in mappings:
            # Hardcoded string literals and simple assignments
            if '//' in db_key or db_key == '""' or db_key == '1' or db_key == '0.500000':
                lines.append(f"{svm_key}={db_key}")
            else:
                entry = setup_data.get(db_key)
                if isinstance(entry, dict) and entry.get('available'):
                    val = entry.get('value', 0)
                    str_val = entry.get('stringValue', 'N/A')
                    lines.append(f"{svm_key}={val}//{str_val}")
                else:
                    lines.append(f"{svm_key}=0//N/A")
        lines.append('')
        
    return "\n".join(lines).strip() + "\n"
