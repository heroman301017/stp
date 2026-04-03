/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bus, 
  Users, 
  Calendar, 
  Clock, 
  MapPin, 
  Info,
  CheckCircle2,
  AlertCircle,
  Truck,
  Car,
  Printer,
  ChevronRight
} from "lucide-react";
import { sportsData } from "./data";
import { Sport, Event, TransportGroup, VehicleAssignment } from "./types";

export default function App() {
  const [selectedDay, setSelectedDay] = useState<number>(6);
  const days = [6, 7, 8, 9];

  // Group events by day and time and assign vehicles
  const transportPlan = useMemo(() => {
    const allGroups: TransportGroup[] = [];
    
    days.forEach(day => {
      const dayEvents: { time: string; sport: Sport; event: Event }[] = [];
      
      sportsData.forEach(sport => {
        sport.events.forEach(event => {
          if (event.day === day) {
            dayEvents.push({ time: event.time, sport, event });
          }
        });
      });

      // Sort events by time
      dayEvents.sort((a, b) => a.time.localeCompare(b.time));

      // 1. Initial Grouping by time proximity (within 30 mins)
      const dayGroups: { departureTime: string; sports: Sport[]; totalParticipants: number }[] = [];
      let currentGroup: { departureTime: string; sports: Sport[]; totalParticipants: number } | null = null;
      const sportsAtStadium = new Set<number>();

      dayEvents.forEach(item => {
        const [hours, minutes] = item.time.split(":").map(Number);
        const itemMinutes = hours * 60 + minutes;
        // Lead time: 1.30 hours (90 minutes)
        const departureMinutes = itemMinutes - 90;
        const departureTime = `${String(Math.floor(departureMinutes / 60)).padStart(2, '0')}:${String(departureMinutes % 60).padStart(2, '0')}`;

        // Check if sport is already at stadium
        if (sportsAtStadium.has(item.sport.id)) return;

        if (!currentGroup || 
            (Math.abs(itemMinutes - (parseInt(currentGroup.departureTime.split(":")[0]) * 60 + parseInt(currentGroup.departureTime.split(":")[1]) + 90)) > 30)) {
          
          currentGroup = {
            departureTime,
            sports: [item.sport],
            totalParticipants: item.sport.participants
          };
          dayGroups.push(currentGroup);
        } else {
          if (!currentGroup.sports.find(s => s.id === item.sport.id)) {
            currentGroup.sports.push(item.sport);
            currentGroup.totalParticipants += item.sport.participants;
          }
        }
        
        // Mark as at stadium for future groups in the same day
        sportsAtStadium.add(item.sport.id);
      });

      // 2. Vehicle Assignment Logic for the day
      let busUsed = false;
      const vanTrips = { VAN_1: 0, VAN_2: 0, VAN_3: 0 };
      
      dayGroups.forEach(group => {
        const assignedVehicles: VehicleAssignment[] = [];
        let remainingParticipants = group.totalParticipants;

        // Rule 1: Use Bus (50 seats) if not used yet and group is large (> 20)
        if (!busUsed && remainingParticipants > 20) {
          assignedVehicles.push({ type: "BUS", seats: 50 });
          remainingParticipants = Math.max(0, remainingParticipants - 50);
          busUsed = true;
        }

        // Rule 2: Use Vans 1-3 (max 3 trips each)
        // Note: Total pool of vans is limited to 5 (VAN_1, VAN_2, VAN_3 + 2 SRU Vans)
        while (remainingParticipants > 0) {
          let vanAssigned = false;
          const vanTypes: ("VAN_1" | "VAN_2" | "VAN_3")[] = ["VAN_1", "VAN_2", "VAN_3"];
          
          for (const type of vanTypes) {
            if (vanTrips[type] < 3) {
              assignedVehicles.push({ type, seats: 10 });
              vanTrips[type]++;
              remainingParticipants -= 10;
              vanAssigned = true;
              break;
            }
          }

          if (!vanAssigned) break; 
        }

        // Rule 3: Use SRU Van for remaining (Limit total vans in one trip to 5)
        while (remainingParticipants > 0) {
          const currentVansInTrip = assignedVehicles.filter(v => v.type.startsWith("VAN")).length;
          if (currentVansInTrip >= 5) {
            // If we hit the 5-van limit, we might need a second trip or wait
            // For now, we'll assign it but note the constraint in UI
            assignedVehicles.push({ type: "VAN_SRU", seats: 10 });
          } else {
            assignedVehicles.push({ type: "VAN_SRU", seats: 10 });
          }
          remainingParticipants -= 10;
        }

        allGroups.push({
          day,
          departureTime: group.departureTime,
          sports: group.sports,
          totalParticipants: group.totalParticipants,
          assignedVehicles
        });
      });
    });

    return allGroups;
  }, []);

  const filteredPlan = transportPlan.filter(group => group.day === selectedDay);

  const getVehicleLabel = (type: string) => {
    switch(type) {
      case "BUS": return "รถบัส (50 ที่นั่ง)";
      case "VAN_1": return "รถตู้ 1 (10 ที่นั่ง)";
      case "VAN_2": return "รถตู้ 2 (10 ที่นั่ง)";
      case "VAN_3": return "รถตู้ 3 (10 ที่นั่ง)";
      case "VAN_SRU": return "รถตู้ มรส (ไม่จำกัดเที่ยว)";
      default: return type;
    }
  };

  const getVehicleIcon = (type: string) => {
    if (type === "BUS") return <Bus className="w-4 h-4" />;
    if (type.startsWith("VAN")) return <Car className="w-4 h-4" />;
    return <Truck className="w-4 h-4" />;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8 print:p-0 print:bg-white">
      <div className="max-w-6xl mx-auto print:max-w-full">
        {/* Print Header (Only visible when printing) */}
        <div className="hidden print:block mb-8 text-center border-b-2 border-slate-900 pb-6">
          <h1 className="text-2xl font-bold mb-1">แผนการจัดรถรับ-ส่งนักกีฬาและเจ้าหน้าที่</h1>
          <h2 className="text-xl font-bold mb-2">การแข่งขันกีฬานักศึกษา มหาวิทยาลัยราชภัฏภาคใต้ "นคราปัญญา"</h2>
          <p className="text-lg">ประจำวันที่ {selectedDay} เมษายน 2569</p>
          <div className="mt-4 flex justify-center gap-8 text-sm">
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> คำนวณเวลาล่วงหน้า 1.30 ชม.</span>
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> ต้นทาง: หอพักนักศึกษา - ปลายทาง: สนามแข่งขัน</span>
          </div>
        </div>

        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div className="print:block">
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-2 print:text-2xl">
              <Bus className="text-blue-600 w-8 h-8 print:w-6 print:h-6" />
              Sports Transport Planner
            </h1>
            <p className="text-slate-500 mt-1 print:text-sm">แผนการจัดการรถรับ-ส่งนักกีฬา มหาวิทยาลัยราชภัฏสุราษฎร์ธานี</p>
          </div>
          
          <div className="flex items-center gap-3 print:hidden">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              พิมพ์แผนการเดินทาง
            </button>
            <div className="flex flex-col gap-1 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                <Info className="w-3 h-3" />
                เงื่อนไขการใช้รถ
              </div>
              <ul className="text-xs text-slate-600 space-y-1 mt-1">
                <li>• รถบัส 50 ที่นั่ง: วิ่งวันละ 1 เที่ยว</li>
                <li>• รถตู้: มีทั้งหมด 5 คัน (รวมรถตู้ 1-3 และรถตู้ มรส)</li>
                <li>• รถตู้ 1-3: วิ่งวันละไม่เกิน 3 เที่ยว/คัน</li>
                <li>• ระบบคำนวณเฉพาะนักกีฬาที่ยังไม่ได้เดินทางไปสนาม</li>
              </ul>
            </div>
          </div>
        </header>

        {/* Day Selector */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide print:hidden">
          {days.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-6 py-3 rounded-2xl font-semibold transition-all whitespace-nowrap ${
                selectedDay === day 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105" 
                : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              วันที่ {day}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:block">
          {/* Schedule List */}
          <div className="lg:col-span-2 space-y-4 print:hidden">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                ตารางการแข่งขันวันที่ {selectedDay}
              </h2>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-sm font-semibold text-slate-500">เวลาแข่ง</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-500">ประเภทกีฬา</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-500">จำนวนคน</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-500">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody>
                  {sportsData.flatMap(sport => 
                    sport.events
                      .filter(e => e.day === selectedDay)
                      .map((event, idx) => (
                        <tr key={`${sport.id}-${idx}`} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-blue-600">{event.time}</td>
                          <td className="px-6 py-4 font-semibold">{sport.name}</td>
                          <td className="px-6 py-4">
                            <span className="bg-slate-100 px-2 py-1 rounded-lg text-sm font-medium">
                              {sport.participants} คน
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">{event.description}</td>
                        </tr>
                      ))
                  ).sort((a, b) => a.key!.toString().localeCompare(b.key!.toString()))}
                  {sportsData.every(s => s.events.every(e => e.day !== selectedDay)) && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                        ไม่มีรายการแข่งขันในวันนี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transport Plan Sidebar */}
          <div className="space-y-6 print:space-y-4">
            <div className="bg-blue-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden print:bg-white print:text-slate-900 print:shadow-none print:p-4 print:border print:border-slate-200 print:rounded-2xl">
              <div className="relative z-10">
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2 print:text-lg">
                  <Bus className="w-6 h-6 print:text-blue-600" />
                  สรุปการจัดรถ วันที่ {selectedDay}
                </h2>
                <p className="text-blue-200 text-sm mb-6 print:text-slate-500 print:mb-4">
                  จัดรถตามเงื่อนไขจำกัดจำนวนเที่ยว (เตรียมตัว 1.30 ชม. ก่อนแข่ง)
                </p>
                
                <div className="grid grid-cols-2 gap-4 print:flex print:gap-8">
                  <div className="bg-blue-800/50 p-4 rounded-2xl border border-blue-700/50 print:bg-slate-50 print:border-slate-100 print:p-2">
                    <p className="text-xs text-blue-300 uppercase tracking-wider font-bold mb-1 print:text-slate-400">จำนวนเที่ยว</p>
                    <p className="text-3xl font-bold print:text-xl">{filteredPlan.length} เที่ยว</p>
                  </div>
                  <div className="bg-blue-800/50 p-4 rounded-2xl border border-blue-700/50 print:bg-slate-50 print:border-slate-100 print:p-2">
                    <p className="text-xs text-blue-300 uppercase tracking-wider font-bold mb-1 print:text-slate-400">จำนวนรถที่ใช้</p>
                    <p className="text-3xl font-bold print:text-xl">
                      {filteredPlan.reduce((acc, curr) => acc + curr.assignedVehicles.length, 0)} ครั้ง
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 print:space-y-2">
              <h3 className="font-bold text-slate-700 px-2 print:text-lg print:mt-4 print:mb-2">แผนการเดินทางรายเที่ยว (Departure Schedule)</h3>
              
              <div className="hidden print:block overflow-hidden border border-slate-300 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300">
                      <th className="px-3 py-2 text-xs font-bold uppercase border-r border-slate-300 w-24">เวลาออก</th>
                      <th className="px-3 py-2 text-xs font-bold uppercase border-r border-slate-300">นักกีฬา / ประเภทกีฬา</th>
                      <th className="px-3 py-2 text-xs font-bold uppercase border-r border-slate-300">รถที่ได้รับมอบหมาย</th>
                      <th className="px-3 py-2 text-xs font-bold uppercase text-right w-24">จำนวนคน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlan.map((group, idx) => (
                      <tr key={idx} className="border-b border-slate-200 break-inside-avoid">
                        <td className="px-3 py-3 font-bold text-lg border-r border-slate-300 align-top">{group.departureTime}</td>
                        <td className="px-3 py-3 border-r border-slate-300 align-top">
                          <div className="flex flex-wrap gap-x-2 gap-y-1">
                            {group.sports.map(s => (
                              <span key={s.id} className="text-sm">
                                • {s.name} ({s.participants})
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3 border-r border-slate-300 align-top">
                          <div className="space-y-1">
                            {group.assignedVehicles.map((v, vIdx) => (
                              <div key={vIdx} className="text-sm flex items-center gap-1">
                                <ChevronRight className="w-3 h-3 text-slate-400" />
                                {getVehicleLabel(v.type)}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-bold align-top">{group.totalParticipants}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <AnimatePresence mode="popLayout">
                {filteredPlan.map((group, idx) => (
                  <motion.div
                    key={`${group.day}-${group.departureTime}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow print:hidden"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">เวลาออกเดินทาง</p>
                          <p className="text-xl font-black text-slate-800">{group.departureTime} น.</p>
                        </div>
                      </div>
                      <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-green-100">
                        <CheckCircle2 className="w-3 h-3" />
                        จัดรถ {group.assignedVehicles.length} คัน
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">นักกีฬาที่เดินทาง</p>
                        <div className="flex flex-wrap gap-1">
                          {group.sports.map(sport => (
                            <span key={sport.id} className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg text-xs font-semibold text-slate-600">
                              {sport.name} ({sport.participants})
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">รถที่ได้รับมอบหมาย</p>
                        <div className="space-y-1">
                          {group.assignedVehicles.map((v, vIdx) => (
                            <div key={vIdx} className="flex items-center gap-2 text-sm font-medium text-blue-700 bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100">
                              {getVehicleIcon(v.type)}
                              {getVehicleLabel(v.type)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <Users className="w-4 h-4" />
                        <span>รวม {group.totalParticipants} คน</span>
                      </div>
                      <div className="flex items-center gap-1 text-blue-600 text-sm font-bold">
                        <MapPin className="w-4 h-4" />
                        <span>สนามกีฬา</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Print Footer (Only visible when printing) */}
        <div className="hidden print:grid grid-cols-2 gap-12 mt-16 px-8">
          <div className="text-center">
            <p className="mb-16">ลงชื่อ...........................................................</p>
            <p className="font-bold">(...........................................................)</p>
            <p className="text-sm text-slate-500">ผู้จัดทำแผนการเดินทาง</p>
          </div>
          <div className="text-center">
            <p className="mb-16">ลงชื่อ...........................................................</p>
            <p className="font-bold">(...........................................................)</p>
            <p className="text-sm text-slate-500">ผู้อนุมัติ/หัวหน้าคณะนักกีฬา</p>
          </div>
        </div>

        {/* Footer Info */}
        <footer className="mt-12 p-6 bg-white rounded-3xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-sm text-slate-600">
              <span className="font-bold">หมายเหตุ:</span> แผนนี้พยายามประหยัดการใช้รถ มรส โดยใช้รถบัสและรถตู้ 1-3 ให้เต็มโควตาก่อน
            </p>
          </div>
          <p className="text-xs text-slate-400">
            © 2026 Sports Transport Planner
          </p>
        </footer>
      </div>
    </div>
  );
}
