<?php

namespace Database\Seeders;

final class LegacyMarketplaceReferenceData
{
    /** @return list<array{code: string, name: string, children: list<array{code: string, name: string, type: string, children: list<array{string, string}>}>}> */
    public static function areas(): array
    {
        return [
            [
                'code' => '1000000000',
                'name' => 'Region X (Northern Mindanao)',
                'children' => [[
                    'code' => '1004300000',
                    'name' => 'Misamis Oriental',
                    'type' => 'province',
                    'children' => [[
                        'code' => '1004308000',
                        'name' => 'City of Gingoog',
                        'type' => 'city',
                        'children' => self::gingoogBarangays(),
                    ]],
                ]],
            ],
            [
                'code' => '1600000000',
                'name' => 'Region XIII (Caraga)',
                'children' => [[
                    'code' => '1600200000',
                    'name' => 'Agusan del Norte',
                    'type' => 'province',
                    'children' => [[
                        'code' => '1630400000',
                        'name' => 'City of Butuan',
                        'type' => 'city',
                        'children' => self::butuanBarangays(),
                    ]],
                ]],
            ],
        ];
    }

    /** @return list<array{string, string}> */
    private static function gingoogBarangays(): array
    {
        return [
            ['1004308001', 'Agay-ayan'], ['1004308002', 'Alagatan'], ['1004308003', 'Anakan'],
            ['1004308004', 'Bagubad'], ['1004308005', 'Bakidbakid'], ['1004308006', 'Bal-ason'],
            ['1004308007', 'Bantaawan'], ['1004308008', 'Binakalan'], ['1004308010', 'Capitulangan'],
            ['1004308011', 'Daan-Lungsod'], ['1004308012', 'Hindangon'], ['1004308013', 'Kalagonoy'],
            ['1004308014', 'Kibuging'], ['1004308015', 'Kipuntos'], ['1004308016', 'Lawaan'],
            ['1004308017', 'Lawit'], ['1004308018', 'Libertad'], ['1004308019', 'Libon'],
            ['1004308020', 'Lunao'], ['1004308021', 'Lunotan'], ['1004308022', 'Malibud'],
            ['1004308023', 'Malinao'], ['1004308024', 'Maribucao'], ['1004308025', 'Mimbuntong'],
            ['1004308026', 'Mimbalagon'], ['1004308027', 'Mimbunga'], ['1004308028', 'Minsapinit'],
            ['1004308029', 'Murallon'], ['1004308030', 'Odiongan'], ['1004308031', 'Pangasihan'],
            ['1004308032', 'Pigsaluhan'], ['1004308033', 'Barangay 1'], ['1004308034', 'Barangay 10'],
            ['1004308035', 'Barangay 11'], ['1004308036', 'Barangay 12'], ['1004308037', 'Barangay 13'],
            ['1004308038', 'Barangay 14'], ['1004308039', 'Barangay 15'], ['1004308040', 'Barangay 16'],
            ['1004308041', 'Barangay 17'], ['1004308042', 'Barangay 18-A'], ['1004308043', 'Barangay 19'],
            ['1004308044', 'Barangay 2'], ['1004308045', 'Barangay 20'], ['1004308046', 'Barangay 21'],
            ['1004308047', 'Barangay 22-A'], ['1004308048', 'Barangay 23'], ['1004308049', 'Barangay 24'],
            ['1004308050', 'Barangay 25'], ['1004308051', 'Barangay 26'], ['1004308055', 'Barangay 3'],
            ['1004308056', 'Barangay 4'], ['1004308057', 'Barangay 5'], ['1004308058', 'Barangay 6'],
            ['1004308059', 'Barangay 7'], ['1004308060', 'Barangay 8'], ['1004308061', 'Barangay 9'],
            ['1004308062', 'Punong'], ['1004308063', 'Ricoro'], ['1004308064', 'Samay'],
            ['1004308065', 'San Juan'], ['1004308066', 'San Luis'], ['1004308067', 'San Miguel'],
            ['1004308068', 'Santiago'], ['1004308069', 'Talisay'], ['1004308070', 'Talon'],
            ['1004308071', 'Tinabalan'], ['1004308072', 'Tinulongan'], ['1004308073', 'Barangay 18'],
            ['1004308074', 'Barangay 22'], ['1004308075', 'Barangay 24-A'], ['1004308076', 'Dinawehan'],
            ['1004308077', 'Eureka'], ['1004308078', 'Kalipay'], ['1004308079', 'Kamanikan'],
            ['1004308080', 'Kianlagan'], ['1004308081', 'San Jose'], ['1004308082', 'Sangalan'],
            ['1004308083', 'Tagpako'],
        ];
    }

    /** @return list<array{string, string}> */
    private static function butuanBarangays(): array
    {
        return [
            ['1630400002', 'Agao Pob.'], ['1630400003', 'Agusan Pequeño'], ['1630400004', 'Ambago'],
            ['1630400006', 'Amparo'], ['1630400007', 'Ampayon'], ['1630400008', 'Anticala'],
            ['1630400009', 'Antongalon'], ['1630400010', 'Aupagan'], ['1630400012', 'Baan KM 3'],
            ['1630400013', 'Babag'], ['1630400014', 'Bading Pob.'], ['1630400016', 'Bancasi'],
            ['1630400017', 'Banza'], ['1630400018', 'Baobaoan'], ['1630400019', 'Basag'],
            ['1630400020', 'Bayanihan Pob.'], ['1630400021', 'Bilay'], ['1630400022', 'Bit-os'],
            ['1630400023', 'Bitan-agan'], ['1630400024', 'Bobon'], ['1630400025', 'Bonbon'],
            ['1630400026', 'Bugabus'], ['1630400027', 'Buhangin Pob.'], ['1630400029', 'Cabcabon'],
            ['1630400031', 'Camayahan'], ['1630400033', 'Baan Riverside Pob.'], ['1630400036', 'Dankias'],
            ['1630400037', 'Imadejas Pob.'], ['1630400038', 'Diego Silang Pob.'], ['1630400039', 'Doongan'],
            ['1630400040', 'Dumalagan'], ['1630400043', 'Golden Ribbon Pob.'], ['1630400044', 'Dagohoy Pob.'],
            ['1630400045', 'Jose Rizal Pob.'], ['1630400047', 'Holy Redeemer Pob.'], ['1630400048', 'Humabon Pob.'],
            ['1630400049', 'Kinamlutan'], ['1630400051', 'Lapu-lapu Pob.'], ['1630400052', 'Lemon'],
            ['1630400053', 'Leon Kilat Pob.'], ['1630400054', 'Libertad'], ['1630400055', 'Limaha Pob.'],
            ['1630400056', 'Los Angeles'], ['1630400057', 'Lumbocan'], ['1630400060', 'Maguinda'],
            ['1630400061', 'Mahay'], ['1630400062', 'Mahogany Pob.'], ['1630400063', 'Maibu'],
            ['1630400064', 'Mandamo'], ['1630400065', 'Manila de Bugabus'], ['1630400066', 'Maon Pob.'],
            ['1630400067', 'Masao'], ['1630400068', 'Maug'], ['1630400069', 'Port Poyohon Pob.'],
            ['1630400070', 'New Society Village Pob.'], ['1630400071', 'Ong Yiu Pob.'], ['1630400072', 'Pianing'],
            ['1630400073', 'Pinamanculan'], ['1630400074', 'Rajah Soliman Pob.'], ['1630400075', 'San Ignacio Pob.'],
            ['1630400076', 'San Mateo'], ['1630400077', 'San Vicente'], ['1630400078', 'Sikatuna Pob.'],
            ['1630400079', 'Silongan Pob.'], ['1630400080', 'Sumilihon'], ['1630400082', 'Tagabaca'],
            ['1630400083', 'Taguibo'], ['1630400084', 'Taligaman'], ['1630400085', 'Tandang Sora Pob.'],
            ['1630400086', 'Tiniwisan'], ['1630400087', 'Tungao'], ['1630400089', 'Urduja Pob.'],
            ['1630400090', 'Villa Kananga'], ['1630400091', 'Obrero Pob.'], ['1630400092', 'Bugsukan'],
            ['1630400093', 'De Oro'], ['1630400094', 'Dulag'], ['1630400095', 'Florida'],
            ['1630400096', 'Nong-nong'], ['1630400097', 'Pagatpatan'], ['1630400098', 'Pangabugan'],
            ['1630400099', 'Salvacion'], ['1630400100', 'Santo Niño'], ['1630400101', 'Sumile'],
            ['1630400102', 'Don Francisco'], ['1630400103', 'Pigdaulan'],
        ];
    }
}
