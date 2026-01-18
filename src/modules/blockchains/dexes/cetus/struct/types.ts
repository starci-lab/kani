// {
//     type: '0xbe21a06129308e0495431d12286127897aff07a8ade3970495a4404d97f9eaaa::skip_list::Node<0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::tick::Tick>',
//     fields: {
//       nexts: [
//         {
//           type: '0xbe21a06129308e0495431d12286127897aff07a8ade3970495a4404d97f9eaaa::option_u64::OptionU64',
//           fields: { is_none: false, v: '502856' }
//         }
//       ],
//       prev: {
//         type: '0xbe21a06129308e0495431d12286127897aff07a8ade3970495a4404d97f9eaaa::option_u64::OptionU64',
//         fields: { is_none: false, v: '502826' }
//       },
//       score: '502836',
//       value: {
//         type: '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::tick::Tick',        
//         fields: {
//           fee_growth_outside_a: '167144806409375916',
//           fee_growth_outside_b: '58404152144592000380',
//           index: {
//             type: '0x714a63a0dba6da4f017b42d5d0fb78867f18bcde904868e51d951a5a6f5b7f57::i32::I32',      
//             fields: { bits: 59200 }
//           },
//           liquidity_gross: '1690659375132',
//           liquidity_net: {
//             type: '0x714a63a0dba6da4f017b42d5d0fb78867f18bcde904868e51d951a5a6f5b7f57::i128::I128',    
//             fields: { bits: '1690659375132' }
//           },
//           points_growth_outside: '840010655612271973090099',
//           rewards_growth_outside: [ '326900452328961232842' ],
//           sqrt_price: '355932067783162035534'
//         }
//       }
//     }
//   }

import {
    SuiMoveObjectContentFields, SuiObject, SuiObjectOptionU64 
} from "../../../structs"

export interface CetusSuiSkipListNodeFields<Value, TypeName extends string = string> {
    nexts: Array<SuiObjectOptionU64<`${string}::option_u64::OptionU64`>>;
    prev: SuiObjectOptionU64<`${string}::option_u64::OptionU64`>;
    score: string;
    fields: SuiMoveObjectContentFields<SuiObject<Value, TypeName>>;
}