// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FacilityReport {
    address public owner;
    uint256 public reportCount;

    enum Status { Reported, InProgress, Resolved }

    struct Report {
        uint256 id;
        address reporter;
        string location;
        string issueType;
        string photoURI;
        string technicianName;
        Status status;
        uint256 timestamp;
    }

    mapping(uint256 => Report) public reports;

    event ReportSubmitted(uint256 indexed id, address indexed reporter, string location, string issueType);
    event TechnicianAssigned(uint256 indexed id, string technicianName);
    event StatusUpdated(uint256 indexed id, Status newStatus);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    function submitReport(string memory _location, string memory _issueType, string memory _photoURI) public {
        reportCount++;
        reports[reportCount] = Report(
            reportCount,
            msg.sender,
            _location,
            _issueType,
            _photoURI,
            "",
            Status.Reported,
            block.timestamp
        );
        
        emit ReportSubmitted(reportCount, msg.sender, _location, _issueType);
    }

    function assignTechnician(uint256 _id, string memory _technicianName) public onlyOwner {
        require(_id > 0 && _id <= reportCount, "Invalid report ID");
        reports[_id].technicianName = _technicianName;
        emit TechnicianAssigned(_id, _technicianName);
    }

    function updateStatus(uint256 _id, Status _newStatus) public onlyOwner {
        require(_id > 0 && _id <= reportCount, "Invalid report ID");
        reports[_id].status = _newStatus;
        emit StatusUpdated(_id, _newStatus);
    }
}
