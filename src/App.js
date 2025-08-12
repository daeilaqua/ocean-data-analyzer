import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Upload, FileText, Droplets, Thermometer, Activity } from 'lucide-react';

// 프로덕션 환경에서 console.log 제거
const isDevelopment = process.env.NODE_ENV === 'development';
const log = isDevelopment ? console.log : () => {};

const OceanDataAnalyzer = () => {
  const [rawData, setRawData] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [currentData, setCurrentData] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isChartFullscreen, setIsChartFullscreen] = useState(false);
  // 초기 데이터 설정
  useEffect(() => {
    const initialData =
      '*FISH@D3@19@0_0_0_0_0_0_0_0_0_0_@0_0_0_0_0_0_0_0_0_0_@0_0_0_0_0_0_0_0_0_0_@0.0_0.0_0.0_0.0_0.0_0.0_0.0_0.0_0.0_0.0_@0_0_0_0_0_0_0_0_0_0_@0_0_0_0_@7.2_32.9_21.0_-100.0_0.0_0.0_0.0_0.0_0.0_0.0_@1_1_1_0_@11.0_39.0_29.0_30.0_@3.0_20.0_9.0_10.0_@	2025-06-13 오전 9:42:33';

    const extractedData = extractValueBetweenDelimiters(initialData);
    setRawData(initialData);
    parseData(extractedData);
  }, []);

  const parseData = (data) => {
    // const targetPattern = /@(\d+\.?\d*)_(\d+\.?\d*)_(\d+\.?\d*)_(\d+\.?\d*)_[\d\._]*/g;
    // 음수도 매칭되도록 -? 추가
    const targetPattern = /@(-?\d+\.?\d*)_(-?\d+\.?\d*)_(-?\d+\.?\d*)_(-?\d+\.?\d*)_[\d\._]*/g;
    const matches = [...data.combinedValues.matchAll(targetPattern)];

    // log(`FISH 데이터 ${data}:`);

    const parsed = matches
      .map((match, index) => {
        // individualResults에서 해당 인덱스의 날짜 정보 가져오기
        const dateTime = data.individualResults[index]?.dateTime || new Date().toLocaleString();

        return {
          id: index + 1,
          timestamp: dateTime, // individualResults에서 추출한 날짜 사용
          dissolvedOxygen: parseFloat(match[1]),
          salinity: parseFloat(match[2]),
          temperature: parseFloat(match[3]),
          pressure: parseFloat(match[4]),
        };
      })
      .filter((item) => item.dissolvedOxygen > 0 || item.salinity > 0 || item.temperature > 0);

    setParsedData(parsed);
    if (parsed.length > 0) {
      setCurrentData(parsed[parsed.length - 1]);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target.result;

        const extract = extractValueBetweenDelimiters(content);

        setRawData(content);

        parseData(extract);

        setUploadedFiles((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            uploadTime: new Date().toLocaleString(),
          },
        ]);
      };
      reader.readAsText(file);
    }
  };

  const toggleChartFullscreen = () => {
    setIsChartFullscreen(!isChartFullscreen);
  };
  // ESC 키로 팝업 닫기
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isChartFullscreen) {
        setIsChartFullscreen(false);
      }
    };

    if (isChartFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isChartFullscreen]);

  /**
   * FISH 데이터에서 특정 위치의 값과 날짜를 추출하는 함수
   * @param {string} data - 분석할 데이터 문자열
   * @param {number} startIndex - 시작 구분자 인덱스 (기본값: 8, 9번째 @)
   * @param {number} endIndex - 끝 구분자 인덱스 (기본값: 9, 10번째 @)
   * @returns {object} 추출된 값과 날짜 정보
   */
  const extractValueBetweenDelimiters = (data, startIndex = 8, endIndex = 9) => {
    console.log('=== extractValueBetweenDelimiters 시작 ===');
    console.log('입력 데이터:', data);

    // FISH 패턴으로 데이터 분할 (*FISH로 시작하는 부분들)
    const fishDataPattern = /\*FISH[^*]*/g;
    const fishDataMatches = data.match(fishDataPattern) || [];

    log('발견된 FISH 데이터 개수:', fishDataMatches.length);

    const results = [];

    fishDataMatches.forEach((fishData, fishIndex) => {
      log(`FISH 데이터 ${fishIndex + 1}:`, fishData);

      // 마지막 @ 이후의 날짜 추출
      const lastAtIndex = fishData.lastIndexOf('@');
      let dateTime = '';
      if (lastAtIndex !== -1) {
        const afterLastAt = fishData.substring(lastAtIndex + 1).trim();
        dateTime = afterLastAt;
        log(`FISH ${fishIndex + 1} - 추출된 날짜:`, dateTime);
      }

      // @ 위치들을 찾기
      const delimiterPositions = [];
      for (let i = 0; i < fishData.length; i++) {
        if (fishData[i] === '@') {
          delimiterPositions.push(i);
        }
      }

      log(`FISH ${fishIndex + 1} - @ 위치들:`, delimiterPositions);
      log(`FISH ${fishIndex + 1} - 총 @ 개수:`, delimiterPositions.length);

      // 충분한 구분자가 있는지 확인
      if (delimiterPositions.length > endIndex) {
        const start = delimiterPositions[startIndex] + 1; // 시작 구분자 다음부터
        const end = delimiterPositions[endIndex]; // 끝 구분자 앞까지

        const extractedValue = fishData.substring(start, end);
        log(`FISH ${fishIndex + 1} - ${startIndex + 1}번째와 ${endIndex + 1}번째 @ 사이의 값:`, extractedValue);

        if (extractedValue.trim()) {
          results.push({
            fishIndex: fishIndex + 1,
            extractedValue: extractedValue,
            dateTime: dateTime,
            rawData: fishData,
          });
        }
      } else {
        log(`FISH ${fishIndex + 1} - @ 기호가 충분하지 않습니다.`);
      }
    });

    // @ 구분자로 연결된 값들에 날짜 포함
    const combinedParts = results.map((r) => `${r.extractedValue}`);
    const combinedValues = combinedParts.length > 0 ? '@' + combinedParts.join('@') + '@' : '';

    return {
      combinedValues: combinedValues,
      individualResults: results,
      count: results.length,
    };
  };

  const getAnalysisStatus = (value, type) => {
    log(`FISH getAnalysisStatus ${value}:`, type);

    switch (type) {
      case 'oxygen':
        if (value > 8) return { status: '양호', color: 'text-green-600', bg: 'bg-green-100' };
        if (value > 5) return { status: '보통', color: 'text-yellow-600', bg: 'bg-yellow-100' };
        return { status: '위험', color: 'text-red-600', bg: 'bg-red-100' };
      case 'salinity':
        if (value >= 30 && value <= 35) return { status: '정상', color: 'text-green-600', bg: 'bg-green-100' };
        if (value >= 25 && value <= 40) return { status: '주의', color: 'text-yellow-600', bg: 'bg-yellow-100' };
        return { status: '비정상', color: 'text-red-600', bg: 'bg-red-100' };
      case 'temperature':
        if (value >= 15 && value <= 25) return { status: '적정', color: 'text-green-600', bg: 'bg-green-100' };
        if (value >= 10 && value <= 30) return { status: '보통', color: 'text-yellow-600', bg: 'bg-yellow-100' };
        return { status: '주의', color: 'text-red-600', bg: 'bg-red-100' };
      default:
        return { status: '알 수 없음', color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  // 대안: 간단한 SVG 차트
  const SVGChart = ({ data }) => {
    const width = 800;
    const height = 400;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const maxValue = Math.max(...data.flatMap((item) => [item.dissolvedOxygen, item.salinity, item.temperature]));

    const xStep = chartWidth / (data.length - 1);

    const createPath = (values) => {
      return values
        .map((value, index) => {
          const x = margin.left + index * xStep;
          const y = margin.top + chartHeight - (value / maxValue) * chartHeight;
          return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">해양 데이터 분석 시스템</h1>
          <p className="text-lg text-blue-700">DO, 염도, 수온 모니터링</p>
        </div>

        {/* 데이터 업로드 섹션 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
            <Upload className="mr-2" /> 데이터 업로드
          </h2>
          <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center">
            <input type="file" accept=".txt,.dat,.csv" onChange={handleFileUpload} className="hidden" id="fileUpload" />
            <label htmlFor="fileUpload" className="cursor-pointer flex flex-col items-center justify-center space-y-2">
              <FileText className="w-12 h-12 text-blue-500" />
              <span className="text-lg font-medium text-gray-700">Raw 데이터 파일을 업로드하세요</span>
              <span className="text-sm text-gray-500">.txt, .dat, .csv 파일 지원</span>
            </label>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-medium text-gray-700 mb-2">업로드된 파일:</h3>
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                    <span className="font-medium">{file.name}</span>
                    <span className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB - {file.uploadTime}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 현재 데이터 분석 */}
        {currentData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                  <Droplets className="mr-2 text-blue-500" />
                  DO
                </h3>
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getAnalysisStatus(currentData.dissolvedOxygen, 'oxygen').bg} ${
                    getAnalysisStatus(currentData.dissolvedOxygen, 'oxygen').color
                  }`}
                >
                  {getAnalysisStatus(currentData.dissolvedOxygen, 'oxygen').status}
                </div>
              </div>
              <div className="text-3xl font-bold text-blue-600 mb-2">{currentData.dissolvedOxygen} mg/L</div>
              <div className="text-sm text-gray-600">권장 범위: 5-8+ mg/L</div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                  <Activity className="mr-2 text-green-500" />
                  염도
                </h3>
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getAnalysisStatus(currentData.salinity, 'salinity').bg} ${
                    getAnalysisStatus(currentData.salinity, 'salinity').color
                  }`}
                >
                  {getAnalysisStatus(currentData.salinity, 'salinity').status}
                </div>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">{currentData.salinity} PPT</div>
              <div className="text-sm text-gray-600">정상 범위: 30-35 PPT</div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                  <Thermometer className="mr-2 text-red-500" />
                  수온
                </h3>
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getAnalysisStatus(currentData.temperature, 'temperature').bg} ${
                    getAnalysisStatus(currentData.temperature, 'temperature').color
                  }`}
                >
                  {getAnalysisStatus(currentData.temperature, 'temperature').status}
                </div>
              </div>
              <div className="text-3xl font-bold text-red-600 mb-2">{currentData.temperature}°C</div>
              <div className="text-sm text-gray-600">적정 범위: 15-25°C</div>
            </div>
          </div>
        )}

        {/* 차트 섹션 */}
        {parsedData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="chart-header-container">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">시간별 변화 추이</h3>
                <button className="fullscreen-toggle-btn" onClick={toggleChartFullscreen} title="크게 보기">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                </button>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={parsedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="id" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="dissolvedOxygen" stroke="#3B82F6" name="DO" />
                  <Line type="monotone" dataKey="salinity" stroke="#10B981" name="염도" />
                  <Line type="monotone" dataKey="temperature" stroke="#EF4444" name="수온" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/*현재 수질 상태 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">현재 수질 상태</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[currentData]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="dissolvedOxygen" fill="#3B82F6" name="DO" />
                  <Bar dataKey="salinity" fill="#10B981" name="염도" />
                  <Bar dataKey="temperature" fill="#EF4444" name="수온" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Raw 데이터 표시 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Raw 데이터</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="text-sm text-gray-700 overflow-x-auto whitespace-pre-wrap">{rawData || '데이터가 없습니다.'}</pre>
          </div>
        </div>

        {/* 데이터 테이블 */}
        {parsedData.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">파싱된 데이터</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">ID</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">시간</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">DO (mg/L)</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">염도 (PPT)</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">수온 (°C)</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.id}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.timestamp}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.dissolvedOxygen}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.salinity}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.temperature}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* 팝업 모달 */}
        {isChartFullscreen && (
          <div
            className="chart-modal-overlay"
            onClick={(e) => {
              log('오버레이 클릭됨');
              toggleChartFullscreen();
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px',
            }}
          >
            <div
              className="chart-modal-container"
              onClick={(e) => {
                log('모달 컨테이너 클릭됨 (이벤트 전파 중지)');
                e.stopPropagation();
              }}
              style={{
                background: 'white',
                borderRadius: '12px',
                width: '95vw',
                height: '90vh',
                maxWidth: '1400px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
            >
              <div
                className="chart-modal-header"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '20px 24px',
                  borderBottom: '1px solid #e5e7eb',
                  background: '#f9fafb',
                  borderRadius: '12px 12px 0 0',
                }}
              >
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#1f2937' }}>시간별 변화 추이 - 상세보기</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button
                    onClick={(e) => {
                      log('X 버튼 클릭됨');
                      e.stopPropagation();
                      toggleChartFullscreen();
                    }}
                    title="닫기"
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="chart-modal-content" style={{ flex: 1, padding: '24px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    border: '2px solid #3B82F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    background: '#f0f8ff',
                  }}
                >
                  <ResponsiveContainer width="98%" height={500}>
                    <LineChart data={parsedData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="id" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="dissolvedOxygen" stroke="#3B82F6" name="DO" />
                      <Line type="monotone" dataKey="salinity" stroke="#10B981" name="염도" />
                      <Line type="monotone" dataKey="temperature" stroke="#EF4444" name="수온" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OceanDataAnalyzer;
